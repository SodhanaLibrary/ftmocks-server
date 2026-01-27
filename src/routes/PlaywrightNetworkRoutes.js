const fs = require('fs');
const path = require('path');
const uuid = require('uuid');
const { execSync } = require('child_process');
const logger = require('../utils/Logger');
const {
  processURL,
  getDefaultMockData,
  loadMockDataFromMockListFile,
  removeDuplicates,
  nameToFolder,
} = require('../utils/MockUtils');

/**
 * Extract zip file to a temporary directory
 */
const extractZipFile = (zipFilePath, extractDir) => {
  if (!fs.existsSync(extractDir)) {
    fs.mkdirSync(extractDir, { recursive: true });
  }

  // Use unzip command (available on most systems)
  try {
    execSync(`unzip -o "${zipFilePath}" -d "${extractDir}"`, {
      stdio: 'pipe',
    });
    logger.debug('Extracted zip file', { zipFilePath, extractDir }, true);
  } catch (error) {
    // Try using tar for .zip files on systems where unzip might not work
    try {
      execSync(`tar -xf "${zipFilePath}" -C "${extractDir}"`, {
        stdio: 'pipe',
      });
      logger.debug(
        'Extracted zip file using tar',
        { zipFilePath, extractDir },
        true
      );
    } catch (tarError) {
      throw new Error(`Failed to extract zip file: ${error.message}`);
    }
  }
};

/**
 * Clean up temporary directory
 */
const cleanupTempDir = (tempDir) => {
  try {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      logger.debug('Cleaned up temp directory', { tempDir });
    }
  } catch (error) {
    logger.warn('Failed to cleanup temp directory', {
      tempDir,
      error: error.message,
    });
  }
};

/**
 * Parse Playwright trace file and extract network events
 */
const parsePlaywrightTrace = (traceDir) => {
  const networkRequests = [];

  // Find trace files - Playwright trace contains multiple .trace files
  const files = fs.readdirSync(traceDir);

  // Look for network trace file or main trace file
  let traceData = null;

  // Try to find and parse trace.trace or any .trace file
  for (const file of files) {
    if (file.endsWith('.trace')) {
      const traceFilePath = path.join(traceDir, file);
      try {
        const content = fs.readFileSync(traceFilePath, 'utf8');
        // Trace files contain newline-delimited JSON
        const lines = content.split('\n').filter((line) => line.trim());
        for (const line of lines) {
          try {
            const event = JSON.parse(line);
            if (event.type === 'resource-snapshot') {
              // This contains network request/response data
              networkRequests.push(event);
            }
          } catch (parseErr) {
            // Skip invalid JSON lines
          }
        }
      } catch (readErr) {
        logger.debug('Could not read trace file', {
          file,
          error: readErr.message,
        });
      }
    }
  }

  // Also check for network.trace file specifically
  const networkTraceFile = path.join(traceDir, 'trace.network');
  if (fs.existsSync(networkTraceFile)) {
    try {
      const content = fs.readFileSync(networkTraceFile, 'utf8');
      const lines = content.split('\n').filter((line) => line.trim());
      for (const line of lines) {
        try {
          const event = JSON.parse(line);
          networkRequests.push(event);
        } catch (parseErr) {
          // Skip invalid JSON lines
        }
      }
    } catch (readErr) {
      logger.debug('Could not read trace.network file', {
        error: readErr.message,
      });
    }
  }

  // Check for resources directory which contains response bodies
  const resourcesDir = path.join(traceDir, 'resources');
  const resources = {};
  if (fs.existsSync(resourcesDir)) {
    const resourceFiles = fs.readdirSync(resourcesDir);
    for (const resourceFile of resourceFiles) {
      const resourcePath = path.join(resourcesDir, resourceFile);
      try {
        const content = fs.readFileSync(resourcePath);
        resources[resourceFile] = content;
      } catch (err) {
        logger.debug('Could not read resource file', {
          resourceFile,
          error: err.message,
        });
      }
    }
  }

  return { networkRequests, resources, traceDir };
};

/**
 * Convert headers array to object format
 */
const convertHeaders = (headers = []) => {
  const excludedHeaders = (process.env.EXCLUDED_HEADERS || '')
    .toLowerCase()
    .split(',');

  if (Array.isArray(headers)) {
    return headers.reduce((acc, header) => {
      const name = header.name || header.key;
      const value = header.value;
      if (name && !excludedHeaders.includes(name.toLowerCase())) {
        acc[name] = value;
      }
      return acc;
    }, {});
  }

  if (typeof headers === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(headers)) {
      if (!excludedHeaders.includes(key.toLowerCase())) {
        result[key] = value;
      }
    }
    return result;
  }

  return {};
};

/**
 * Get header value from headers array by name (case-insensitive)
 */
const getHeaderValue = (headers = [], headerName) => {
  if (!Array.isArray(headers)) return null;

  const header = headers.find(
    (h) => h.name && h.name.toLowerCase() === headerName.toLowerCase()
  );
  return header ? header.value : null;
};

/**
 * Extract query string from URL
 */
const extractQueryString = (url) => {
  try {
    const parsed = new URL(url);
    return Array.from(parsed.searchParams.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  } catch {
    return [];
  }
};

/**
 * Check if a URL should be included as a mock (API calls, not static resources)
 */
const shouldIncludeRequest = (url, method, contentType = '') => {
  // Skip common static file extensions
  const staticExtensions = [
    '.js',
    '.css',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.ico',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
    '.map',
    '.html',
    '.htm',
  ];

  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();

    // Skip static files
    for (const ext of staticExtensions) {
      if (pathname.endsWith(ext)) {
        return false;
      }
    }

    // Skip data URLs and blob URLs
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return false;
    }

    // Include API-like content types
    const apiContentTypes = [
      'application/json',
      'application/xml',
      'text/xml',
      'application/x-www-form-urlencoded',
    ];

    if (contentType) {
      for (const apiType of apiContentTypes) {
        if (contentType.includes(apiType)) {
          return true;
        }
      }
    }

    // Include common API path patterns
    const apiPatterns = ['/api/', '/v1/', '/v2/', '/graphql', '/rest/'];
    for (const pattern of apiPatterns) {
      if (pathname.includes(pattern)) {
        return true;
      }
    }

    // Include if no extension (likely API endpoint)
    if (!pathname.includes('.') || pathname.endsWith('/')) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

/**
 * Compares a mock to a Playwright request to check for duplicates
 */
const compareMockToPlaywrightRequest = (mock, request, processedUrl) => {
  try {
    const mockURL = processURL(
      mock.fileContent.url,
      mock.fileContent.ignoreParams
    );
    const reqURL = processURL(processedUrl, mock.fileContent.ignoreParams);

    if (mockURL !== reqURL) return false;
    if (mock.fileContent.method !== request.method) return false;

    return true;
  } catch (error) {
    logger.error('Error comparing mock to Playwright request', {
      error: error.message,
    });
    return false;
  }
};

/**
 * Process Playwright trace file and create mock data
 */
const processPlaywrightTraceFile = async (
  traceFilePath,
  outputFolder,
  fileName = '_mock_list.json',
  testName,
  avoidDuplicates
) => {
  const tempDir = path.join(
    path.dirname(traceFilePath),
    `trace_extract_${Date.now()}`
  );

  try {
    logger.info('Processing Playwright trace file', {
      traceFilePath,
      outputFolder,
      fileName,
      testName: testName || 'default',
      avoidDuplicates,
    });

    let defaultMockData = [];
    if (avoidDuplicates === 'true') {
      logger.debug('Loading default mock data for duplicate checking');
      defaultMockData = getDefaultMockData();
      logger.debug('Loaded default mock data', {
        defaultMockCount: defaultMockData.length,
      });
    }

    // Extract the zip file
    extractZipFile(traceFilePath, tempDir);

    // Parse the trace data
    const { networkRequests, resources } = parsePlaywrightTrace(tempDir);

    logger.debug(
      'Parsed Playwright trace',
      {
        networkRequestCount: networkRequests.length,
        resourceCount: Object.keys(resources).length,
      },
      true
    );

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
      logger.debug('Created output folder', { outputFolder }, true);
    }

    let existResps = [];

    if (fs.existsSync(path.join(outputFolder, fileName))) {
      logger.debug('Loading existing responses', { fileName });
      existResps = loadMockDataFromMockListFile(outputFolder, fileName);
      logger.debug('Loaded existing responses', {
        existingCount: existResps.length,
      });
    }

    // Process network requests
    let processedCount = 0;
    let duplicateCount = 0;
    let skippedCount = 0;

    const responses = [];

    for (const event of networkRequests) {
      try {
        // Extract request and response from the event
        // Format: { type: "resource-snapshot", snapshot: { request: {...}, response: {...} } }
        const snapshot = event.snapshot || event;
        const request = snapshot.request;
        const response = snapshot.response || {};

        if (!request || !request.url) continue;

        const url = request.url;
        const method = request.method || 'GET';

        // Get content-type from headers array
        const responseContentType =
          getHeaderValue(response.headers, 'content-type') || '';

        // Filter out static resources
        if (!shouldIncludeRequest(url, method, responseContentType)) {
          skippedCount++;
          continue;
        }

        const processedUrl = processURL(url);

        logger.debug('Processing Playwright network request', {
          url: processedUrl,
          method,
          status: response.status,
        });

        // Check for duplicates in default mocks
        if (defaultMockData.length > 0) {
          const isDuplicate = defaultMockData.find((mock) =>
            compareMockToPlaywrightRequest(mock, request, processedUrl)
          );
          if (isDuplicate) {
            logger.debug('Skipping duplicate with default mocks', {
              url: processedUrl,
              method,
            });
            skippedCount++;
            continue;
          }
        }

        // Check for existing response
        const eresp = existResps.find((resp) =>
          compareMockToPlaywrightRequest(resp, request, processedUrl)
        );

        let duplicate = false;
        if (eresp) {
          existResps = existResps.filter(
            (resp) =>
              !compareMockToPlaywrightRequest(resp, request, processedUrl)
          );
          duplicate = true;
          duplicateCount++;
          logger.debug('Found duplicate in existing responses', {
            url: processedUrl,
            method,
            existingId: eresp.id,
          });
        }

        const mockId = eresp?.id || uuid.v4();
        const responseFileName = `mock_${mockId}.json`;
        const responseFilePath = path.join(outputFolder, responseFileName);

        // Get response body from resources folder using _sha1 reference
        let responseContent = '';
        if (response.content?._sha1) {
          // Response content is stored in resources folder with _sha1 as filename
          const resourceFileName = response.content._sha1;
          if (resources[resourceFileName]) {
            responseContent = resources[resourceFileName].toString('utf8');
          }
        } else if (response.content?.text) {
          responseContent = response.content.text;
        } else if (response.body) {
          responseContent =
            typeof response.body === 'string'
              ? response.body
              : JSON.stringify(response.body);
        }

        // Get request body/post data
        let postData = null;
        if (request.postData) {
          // Get content-type from request headers array
          const requestContentType =
            getHeaderValue(request.headers, 'content-type') ||
            'application/json';

          postData = {
            mimeType: requestContentType,
            text:
              typeof request.postData === 'string'
                ? request.postData
                : JSON.stringify(request.postData),
          };
        }

        // Build response info
        const responseInfo = {
          id: mockId,
          url: processedUrl,
          method,
          request: {
            headers: convertHeaders(request.headers),
            queryString: request.queryString || extractQueryString(url),
            postData,
          },
          response: {
            status: response.status || 200,
            headers: convertHeaders(response.headers),
            content: responseContent,
          },
          ignoreParams: eresp?.fileContent?.ignoreParams,
        };

        fs.writeFileSync(
          responseFilePath,
          JSON.stringify(responseInfo, null, 2)
        );

        logger.debug('Created mock file', {
          mockId,
          responseFilePath,
          url: processedUrl,
          method,
          status: response.status || 200,
        });

        const responseSummaryRecord = {
          fileName: responseFileName,
          method,
          postData,
          url: processedUrl,
          id: mockId,
        };

        existResps.push(
          Object.assign({}, responseSummaryRecord, {
            fileContent: responseInfo,
          })
        );

        if (!duplicate) {
          processedCount++;
          responses.push(responseSummaryRecord);
        }
      } catch (error) {
        logger.error('Error processing network request', {
          error: error.message,
        });
      }
    }

    // Clean up fileContent from responses
    existResps.forEach((element) => {
      delete element.fileContent;
    });
    responses.forEach((element) => {
      delete element.fileContent;
    });

    const finalResponses = removeDuplicates(existResps.concat(responses));

    // Create an index file with references to individual response files
    const indexFilePath = path.join(outputFolder, fileName);
    fs.writeFileSync(indexFilePath, JSON.stringify(finalResponses, null, 2));

    logger.info('Playwright trace processing completed successfully', {
      traceFilePath,
      outputFolder,
      totalNetworkRequests: networkRequests.length,
      processedMocks: processedCount,
      duplicateMocks: duplicateCount,
      skippedRequests: skippedCount,
      finalMockCount: finalResponses.length,
      indexFilePath,
    });

    console.log(
      `Individual response files and index file created in ${outputFolder}`
    );
  } catch (error) {
    logger.error('Error processing Playwright trace file', {
      traceFilePath,
      outputFolder,
      fileName,
      testName,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  } finally {
    // Clean up temp directory
    cleanupTempDir(tempDir);
  }
};

/**
 * Create mock data for a test from Playwright trace file
 */
const createPlaywrightMockDataForTest = async (req, res) => {
  const testId = req.params.id;
  const testsPath = path.join(process.env.MOCK_DIR, 'tests.json');

  if (!req.file) {
    logger.warn('No Playwright trace file uploaded');
    return res.status(400).json({ error: 'No Playwright trace file uploaded' });
  }

  try {
    logger.info('Processing Playwright trace file for test', {
      testId,
      traceFileName: req.file.originalname,
      traceFileSize: req.file.size,
    });

    // Read and parse the 'tests.json' file
    const testsData = JSON.parse(fs.readFileSync(testsPath, 'utf8'));

    // Find the test with the given id
    const testIndex = testsData.findIndex((test) => test.id === testId);

    if (testIndex === -1) {
      logger.warn('Test not found for Playwright trace file processing', {
        testId,
      });
      return res.status(404).json({ error: 'Test not found' });
    }

    const traceFilePath = req.file.path;
    const testName = nameToFolder(req.body.testName);

    logger.debug('Playwright trace file processing parameters', {
      testId,
      testName,
      traceFilePath,
      avoidDuplicates: req.body.avoidDuplicates,
    });

    // Process the Playwright trace file and create mock data
    await processPlaywrightTraceFile(
      traceFilePath,
      path.join(process.env.MOCK_DIR, `test_${testName}`),
      `_mock_list.json`,
      testName,
      req.body.avoidDuplicates
    );

    // Update the test's mockFile array with the new mock data file
    const mockFileName = `test_${testName}/_mock_list.json`;
    testsData[testIndex].mockFile = mockFileName;

    // Save the updated tests data back to 'tests.json'
    fs.writeFileSync(testsPath, JSON.stringify(testsData, null, 2));

    // Clean up the uploaded trace file
    fs.unlinkSync(traceFilePath);
    logger.debug('Cleaned up uploaded Playwright trace file', {
      traceFilePath,
    });

    logger.info('Playwright trace file processed successfully', {
      testId,
      testName,
      mockFileName,
    });

    res.status(201).json({
      message:
        'Playwright trace file processed and mock data added successfully',
      fileName: mockFileName,
    });
  } catch (error) {
    logger.error('Error processing Playwright trace file', {
      testId,
      traceFileName: req.file?.originalname,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: 'Failed to process Playwright trace file and add mock data',
    });
  }
};

/**
 * Upload default mocks from Playwright trace file
 */
const uploadDefaultPlaywrightMocks = async (req, res) => {
  if (!req.file) {
    logger.warn('No Playwright trace file uploaded');
    return res.status(400).json({ error: 'No Playwright trace file uploaded' });
  }

  try {
    const traceFilePath = req.file.path;
    const originalName = req.file.originalname;
    const fileSize = req.file.size;

    logger.info('Processing Playwright trace file for default mocks', {
      originalName,
      fileSize,
      traceFilePath,
    });

    // Process the Playwright trace file and create mock data
    await processPlaywrightTraceFile(
      traceFilePath,
      path.join(process.env.MOCK_DIR, 'defaultMocks'),
      `_mock_list.json`
    );

    // Clean up the uploaded file
    fs.unlinkSync(traceFilePath);
    logger.debug('Cleaned up uploaded Playwright trace file', {
      traceFilePath,
    });

    logger.info(
      'Playwright trace file processed successfully for default mocks',
      {
        originalName,
        processedFile: traceFilePath,
      }
    );

    res
      .status(200)
      .json({ message: 'Playwright trace file processed successfully' });
  } catch (error) {
    logger.error('Error processing Playwright trace file for default mocks', {
      originalName: req.file?.originalname,
      fileSize: req.file?.size,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: 'Failed to process Playwright trace file for default mocks',
    });
  }
};

module.exports = {
  createPlaywrightMockDataForTest,
  uploadDefaultPlaywrightMocks,
};
