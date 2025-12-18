const fs = require('fs');
const path = require('path');
const uuid = require('uuid');
const logger = require('../utils/Logger');
const {
  processURL,
  getDefaultMockData,
  loadMockDataFromMockListFile,
  removeDuplicates,
  nameToFolder,
} = require('../utils/MockUtils');

/**
 * Recursively extracts all request items from a Postman collection
 * Handles nested folders (items containing items)
 */
const extractPostmanItems = (items, parentPath = '') => {
  let requests = [];

  for (const item of items) {
    const currentPath = parentPath ? `${parentPath}/${item.name}` : item.name;

    if (item.item && Array.isArray(item.item)) {
      // This is a folder, recurse into it
      requests = requests.concat(extractPostmanItems(item.item, currentPath));
    } else if (item.request) {
      // This is a request item
      requests.push({
        ...item,
        folderPath: parentPath,
      });
    }
  }

  return requests;
};

/**
 * Converts Postman URL object or string to a URL string
 */
const getPostmanUrl = (urlObj) => {
  if (typeof urlObj === 'string') {
    return urlObj;
  }

  if (urlObj.raw) {
    return urlObj.raw;
  }

  // Build URL from parts
  let url = '';
  if (urlObj.protocol) {
    url += `${urlObj.protocol}://`;
  }
  if (urlObj.host) {
    url += Array.isArray(urlObj.host) ? urlObj.host.join('.') : urlObj.host;
  }
  if (urlObj.port) {
    url += `:${urlObj.port}`;
  }
  if (urlObj.path) {
    const pathStr = Array.isArray(urlObj.path)
      ? urlObj.path.join('/')
      : urlObj.path;
    url += `/${pathStr}`;
  }
  if (urlObj.query && urlObj.query.length > 0) {
    const queryStr = urlObj.query
      .filter((q) => !q.disabled)
      .map((q) => `${q.key}=${q.value || ''}`)
      .join('&');
    if (queryStr) {
      url += `?${queryStr}`;
    }
  }

  return url;
};

/**
 * Converts Postman headers array to headers object
 */
const convertPostmanHeaders = (headers = []) => {
  const excludedHeaders = (process.env.EXCLUDED_HEADERS || '')
    .toLowerCase()
    .split(',');

  return headers
    .filter((h) => !h.disabled)
    .reduce((acc, header) => {
      if (!excludedHeaders.includes(header.key.toLowerCase())) {
        acc[header.key] = header.value;
      }
      return acc;
    }, {});
};

/**
 * Extracts query string from Postman URL object
 */
const extractQueryString = (urlObj) => {
  if (typeof urlObj === 'string') {
    try {
      const parsed = new URL(urlObj);
      return Array.from(parsed.searchParams.entries()).map(([name, value]) => ({
        name,
        value,
      }));
    } catch {
      return [];
    }
  }

  if (urlObj.query && Array.isArray(urlObj.query)) {
    return urlObj.query
      .filter((q) => !q.disabled)
      .map((q) => ({
        name: q.key,
        value: q.value || '',
      }));
  }

  return [];
};

/**
 * Extracts post data from Postman request body
 */
const extractPostData = (body) => {
  if (!body) return null;

  switch (body.mode) {
    case 'raw':
      return {
        mimeType:
          body.options?.raw?.language === 'json'
            ? 'application/json'
            : 'text/plain',
        text: body.raw || '',
      };
    case 'urlencoded':
      return {
        mimeType: 'application/x-www-form-urlencoded',
        params: (body.urlencoded || [])
          .filter((p) => !p.disabled)
          .map((p) => ({
            name: p.key,
            value: p.value || '',
          })),
      };
    case 'formdata':
      return {
        mimeType: 'multipart/form-data',
        params: (body.formdata || [])
          .filter((p) => !p.disabled)
          .map((p) => ({
            name: p.key,
            value: p.value || '',
            type: p.type,
          })),
      };
    case 'file':
      return {
        mimeType: 'application/octet-stream',
        text: '[Binary File]',
      };
    case 'graphql':
      return {
        mimeType: 'application/json',
        text: JSON.stringify({
          query: body.graphql?.query || '',
          variables: body.graphql?.variables || '',
        }),
      };
    default:
      return null;
  }
};

/**
 * Compares a mock to a Postman request to check for duplicates
 */
const compareMockToPostmanRequest = (mock, postmanRequest, processedUrl) => {
  try {
    const mockURL = processURL(
      mock.fileContent.url,
      mock.fileContent.ignoreParams
    );
    const reqURL = processURL(processedUrl, mock.fileContent.ignoreParams);

    if (mockURL !== reqURL) return false;
    if (mock.fileContent.method !== postmanRequest.method) return false;

    return true;
  } catch (error) {
    logger.error('Error comparing mock to Postman request', {
      error: error.message,
    });
    return false;
  }
};

const processPostmanFile = async (
  postmanFilePath,
  outputFolder,
  fileName = '_mock_list.json',
  testName,
  avoidDuplicates
) => {
  try {
    logger.info('Processing Postman collection file', {
      postmanFilePath,
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

    // Read the Postman collection file
    logger.debug('Reading Postman collection file', { postmanFilePath });
    const postmanData = fs.readFileSync(postmanFilePath, 'utf8');

    // Parse Postman collection data
    const postmanCollection = JSON.parse(postmanData);

    // Validate it's a Postman collection
    if (!postmanCollection.info || !postmanCollection.item) {
      throw new Error(
        'Invalid Postman collection format. Expected "info" and "item" properties.'
      );
    }

    logger.debug('Parsed Postman collection', {
      collectionName: postmanCollection.info.name,
      schema: postmanCollection.info.schema,
    });

    // Extract all request items (including from nested folders)
    const postmanItems = extractPostmanItems(postmanCollection.item);
    logger.debug('Extracted Postman items', {
      totalItems: postmanItems.length,
    });

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
      logger.debug('Created output folder', { outputFolder });
    }

    let existResps = [];

    if (fs.existsSync(path.join(outputFolder, fileName))) {
      logger.debug('Loading existing responses', { fileName });
      existResps = loadMockDataFromMockListFile(outputFolder, fileName);
      logger.debug('Loaded existing responses', {
        existingCount: existResps.length,
      });
    }

    // Process each Postman request item
    let processedCount = 0;
    let duplicateCount = 0;
    let skippedCount = 0;
    let noResponseCount = 0;

    const responses = postmanItems
      .flatMap((item, index) => {
        try {
          const request = item.request;
          const rawUrl = getPostmanUrl(request.url);
          const url = processURL(rawUrl);
          const method = request.method || 'GET';

          logger.debug('Processing Postman request', {
            index,
            name: item.name,
            url,
            method,
            folderPath: item.folderPath,
          });

          // Get saved responses for this request
          const savedResponses = item.response || [];

          if (savedResponses.length === 0) {
            // Create a mock with empty response if no saved responses
            noResponseCount++;
            logger.debug(
              'No saved responses for request, creating empty mock',
              {
                name: item.name,
                url,
              }
            );

            const postData = extractPostData(request.body);
            const mockId = uuid.v4();
            const responseFileName = `mock_${mockId}.json`;
            const responseFilePath = path.join(outputFolder, responseFileName);

            const responseInfo = {
              id: mockId,
              url,
              method,
              request: {
                headers: convertPostmanHeaders(request.header),
                queryString: extractQueryString(request.url),
                postData,
              },
              response: {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                content: '{}',
              },
            };

            fs.writeFileSync(
              responseFilePath,
              JSON.stringify(responseInfo, null, 2)
            );

            logger.debug('Created mock file for request without response', {
              mockId,
              responseFilePath,
              url,
              method,
            });

            return {
              fileName: responseFileName,
              method,
              postData,
              url,
              id: mockId,
              name: item.name,
            };
          }

          // Process each saved response
          return savedResponses.map((savedResponse, respIndex) => {
            try {
              const postData = extractPostData(request.body);

              // Check for duplicates in default mocks
              if (defaultMockData.length > 0) {
                const isDuplicate = defaultMockData.find((mock) =>
                  compareMockToPostmanRequest(mock, request, url)
                );
                if (isDuplicate) {
                  logger.debug('Skipping duplicate with default mocks', {
                    url,
                    method,
                  });
                  skippedCount++;
                  return null;
                }
              }

              // Check for existing response
              const eresp = existResps.find((resp) =>
                compareMockToPostmanRequest(resp, request, url)
              );

              let duplicate = false;
              if (eresp) {
                existResps = existResps.filter(
                  (resp) => !compareMockToPostmanRequest(resp, request, url)
                );
                duplicate = true;
                duplicateCount++;
                logger.debug('Found duplicate in existing responses', {
                  url,
                  method,
                  existingId: eresp.id,
                });
              }

              const mockId = eresp?.id || uuid.v4();
              const responseFileName = `mock_${mockId}.json`;
              const responseFilePath = path.join(
                outputFolder,
                responseFileName
              );

              // Build response info
              const responseInfo = {
                id: mockId,
                url,
                method,
                request: {
                  headers: convertPostmanHeaders(request.header),
                  queryString: extractQueryString(request.url),
                  postData,
                },
                response: {
                  status: savedResponse.code || 200,
                  headers: convertPostmanHeaders(savedResponse.header),
                  content: savedResponse.body || '',
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
                url,
                method,
                status: savedResponse.code || 200,
                responseName: savedResponse.name,
              });

              const responseSummaryRecord = {
                fileName: responseFileName,
                method,
                postData,
                url,
                id: mockId,
                name: item.name,
                responseName: savedResponse.name,
              };

              existResps.push(
                Object.assign({}, responseSummaryRecord, {
                  fileContent: responseInfo,
                })
              );

              if (!duplicate) {
                processedCount++;
                return responseSummaryRecord;
              }
              return null;
            } catch (respError) {
              logger.error('Error processing saved response', {
                requestName: item.name,
                responseIndex: respIndex,
                error: respError.message,
              });
              return null;
            }
          });
        } catch (error) {
          logger.error('Error processing Postman request', {
            index,
            name: item?.name,
            error: error.message,
          });
          return null;
        }
      })
      .filter(Boolean);

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

    logger.info('Postman collection processing completed successfully', {
      postmanFilePath,
      outputFolder,
      collectionName: postmanCollection.info.name,
      totalItems: postmanItems.length,
      processedMocks: processedCount,
      duplicateMocks: duplicateCount,
      skippedMocks: skippedCount,
      noResponseMocks: noResponseCount,
      finalMockCount: finalResponses.length,
      indexFilePath,
    });

    console.log(
      `Individual response files and index file created in ${outputFolder}`
    );
  } catch (error) {
    logger.error('Error processing Postman collection file', {
      postmanFilePath,
      outputFolder,
      fileName,
      testName,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const createPostmanMockDataForTest = async (req, res) => {
  const testId = req.params.id;
  const testsPath = path.join(process.env.MOCK_DIR, 'tests.json');

  if (!req.file) {
    logger.warn('No Postman file uploaded');
    return res.status(400).json({ error: 'No Postman file uploaded' });
  }

  try {
    logger.info('Processing Postman file for test', {
      testId,
      postmanFileName: req.file.originalname,
      postmanFileSize: req.file.size,
    });

    // Read and parse the 'tests.json' file
    const testsData = JSON.parse(fs.readFileSync(testsPath, 'utf8'));

    // Find the test with the given id
    const testIndex = testsData.findIndex((test) => test.id === testId);

    if (testIndex === -1) {
      logger.warn('Test not found for Postman file processing', { testId });
      return res.status(404).json({ error: 'Test not found' });
    }

    const postmanFilePath = req.file.path;
    const testName = nameToFolder(req.body.testName);

    logger.debug('Postman file processing parameters', {
      testId,
      testName,
      postmanFilePath,
      avoidDuplicates: req.body.avoidDuplicates,
    });

    // Process the Postman file and create mock data
    await processPostmanFile(
      postmanFilePath,
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

    // Clean up the uploaded Postman file
    fs.unlinkSync(postmanFilePath);
    logger.debug('Cleaned up uploaded Postman file', { postmanFilePath });

    logger.info('Postman file processed successfully', {
      testId,
      testName,
      mockFileName,
    });

    res.status(201).json({
      message: 'Postman file processed and mock data added successfully',
      fileName: mockFileName,
    });
  } catch (error) {
    logger.error('Error processing Postman file', {
      testId,
      postmanFileName: req.file?.originalname,
      error: error.message,
      stack: error.stack,
    });
    res
      .status(500)
      .json({ error: 'Failed to process Postman file and add mock data' });
  }
};

const uploadDefaultPostmanMocks = async (req, res) => {
  if (!req.file) {
    logger.warn('No Postman file uploaded');
    return res.status(400).json({ error: 'No Postman file uploaded' });
  }

  try {
    const postmanFilePath = req.file.path;
    const originalName = req.file.originalname;
    const fileSize = req.file.size;

    logger.info('Processing Postman file for default mocks', {
      originalName,
      fileSize,
      postmanFilePath,
    });

    // Process the Postman file and create mock data
    await processPostmanFile(
      postmanFilePath,
      path.join(process.env.MOCK_DIR, 'defaultMocks'),
      `_mock_list.json`
    );

    // Clean up the uploaded file
    fs.unlinkSync(postmanFilePath);
    logger.debug('Cleaned up uploaded Postman file', { postmanFilePath });

    logger.info('Postman file processed successfully for default mocks', {
      originalName,
      processedFile: postmanFilePath,
    });

    res.status(200).json({ message: 'Postman file processed successfully' });
  } catch (error) {
    logger.error('Error processing Postman file for default mocks', {
      originalName: req.file?.originalname,
      fileSize: req.file?.size,
      error: error.message,
      stack: error.stack,
    });
    res
      .status(500)
      .json({ error: 'Failed to process Postman file for default mocks' });
  }
};

module.exports = { createPostmanMockDataForTest, uploadDefaultPostmanMocks };
