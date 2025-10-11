const fs = require('fs');
const urlmodule = require('url');
const path = require('path');
const uuid = require('uuid');
const logger = require('./Logger');
const {
  processURL,
  getDefaultMockData,
  isSameRequest,
  removeDuplicates,
  compareMockToHarEntry,
  loadMockDataFromMockListFile,
  nameToFolder,
  compareMockToMock,
} = require('./MockUtils');
const { isFileLikeHarEntry } = require('./FileUtils');

function isJsonResponse(entry) {
  // Check if the response has a content type header and it is JSON
  const contentTypeHeader = entry.response.headers.find(
    (header) => header.name.toLowerCase() === 'content-type'
  );

  return (
    contentTypeHeader &&
    (contentTypeHeader.value.includes('application/json') ||
      contentTypeHeader.value.includes('image/png'))
  );
}

function extractFileName(filePath) {
  // Use the path module to handle file paths across different operating systems
  const path = require('path');

  // Extract the base name (file name with extension) from the full path
  const baseName = path.basename(filePath);

  return baseName;
}

function processHAR(
  harFilePath,
  outputFolder,
  fileName = '_mock_list.json',
  testName,
  avoidDuplicates
) {
  try {
    logger.info('Processing HAR file', {
      harFilePath,
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

    // Read the HAR file
    logger.debug('Reading HAR file', { harFilePath });
    const harData = fs.readFileSync(harFilePath, 'utf8');

    // Parse HAR data
    const harObject = JSON.parse(harData);
    logger.debug('Parsed HAR data', {
      totalEntries: harObject.log.entries.length,
    });

    // Create a directory for individual response files
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder);
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

    // Extract information and create individual JSON files for each response
    let processedCount = 0;
    let duplicateCount = 0;
    let skippedCount = 0;

    const responses = harObject.log.entries
      .map((entry, index) => {
        try {
          const url = processURL(entry.request.url);
          const { method, postData } = entry.request;

          logger.debug('Processing HAR entry', {
            index,
            url,
            method,
            status: entry.response.status,
          });

          const isFileLike = isFileLikeHarEntry(entry);
          let filePath = null;
          let fileName = null;
          if (isFileLike) {
            // Save file-like HAR entry to a "_files" directory for reference
            const filesDir = path.join(outputFolder, '_files');
            if (!fs.existsSync(filesDir)) {
              fs.mkdirSync(filesDir, { recursive: true });
            }
            // Use a unique filename: index + original file extension if possible
            let fileExt = '';
            try {
              const urlObj = new URL(url);
              const pathname = urlObj.pathname;
              const lastDot = pathname.lastIndexOf('.');
              if (lastDot !== -1) {
                fileExt = pathname.substring(lastDot);
              }
            } catch (e) {
              // fallback: no extension
              fileExt = '';
            }
            fileName = `${uuid.v4()}${fileExt || ''}`;
            filePath = path.join(filesDir, fileName);

            logger.debug('Saved file-like HAR entry to _files', {
              filePath,
              url,
              method,
              status: entry.response.status,
            });
          }
          const responseInfo = {
            url,
            method,
            request: {
              headers: entry.request.headers.reduce((headers, header) => {
                if (
                  !process.env.EXCLUDED_HEADERS.toLowerCase()
                    .split(',')
                    .includes(header.name.toLowerCase())
                ) {
                  headers[header.name] = header.value;
                }
                return headers;
              }, {}),
              queryString: entry.request.queryString,
              postData: entry.request.postData,
            },
            response: {
              file: fileName,
              status:
                entry.response.status === 304 ? 200 : entry.response.status,
              headers: entry.response.headers.reduce((headers, header) => {
                if (
                  !process.env.EXCLUDED_HEADERS.toLowerCase()
                    .split(',')
                    .includes(header.name.toLowerCase())
                ) {
                  headers[header.name] = header.value;
                }
                return headers;
              }, {}),
              content: fileName ? null : entry.response.content.text,
            },
          };

          if (
            defaultMockData.find((mock) => compareMockToHarEntry(mock, entry))
          ) {
            logger.debug('Skipping duplicate with default mocks', {
              url,
              method,
            });
            skippedCount++;
            return null;
          }

          const eresp = existResps.find((resp) =>
            compareMockToHarEntry(resp, entry)
          );
          let duplicate = false;
          if (eresp) {
            existResps = existResps.filter(
              (resp) => !compareMockToHarEntry(resp, entry)
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

          if (!fs.existsSync(path.join(outputFolder))) {
            fs.mkdirSync(path.join(outputFolder));
            logger.debug('Created subdirectory', {
              outputFolder,
            });
          }

          const responseFilePath = path.join(outputFolder, responseFileName);

          responseInfo.id = mockId;
          responseInfo.ignoreParams = eresp?.fileContent.ignoreParams;

          fs.writeFileSync(
            responseFilePath,
            JSON.stringify(responseInfo, null, 2)
          );
          if (fileName) {
            // Save the file content (decode if base64)
            let fileContent = entry.response.content.text;
            if (entry.response.content.encoding === 'base64') {
              fs.writeFileSync(filePath, Buffer.from(fileContent, 'base64'));
            } else {
              fs.writeFileSync(filePath, fileContent, 'utf8');
            }
          }
          logger.debug('Created mock file', {
            mockId,
            responseFilePath,
            url,
            method,
          });

          const responseSummaryRecord = {
            fileName: responseFileName,
            method,
            postData,
            url,
            id: mockId,
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
        } catch (error) {
          logger.error('Error processing HAR entry', {
            index,
            url: entry?.request?.url,
            error: error.message,
          });
          return null;
        }
      })
      .filter(Boolean); // Filter out non-JSON responses

    existResps.forEach((element) => {
      delete element.fileContent;
    });
    responses.forEach((element) => {
      delete element.fileContent;
    });

    const finalResponses = removeDuplicates(existResps.concat(responses));

    // Create an index file with references to individual response files
    const indexFilePath = `${outputFolder}/${fileName}`;
    fs.writeFileSync(indexFilePath, JSON.stringify(finalResponses, null, 2));

    logger.info('HAR processing completed successfully', {
      harFilePath,
      outputFolder,
      totalEntries: harObject.log.entries.length,
      processedMocks: processedCount,
      duplicateMocks: duplicateCount,
      skippedMocks: skippedCount,
      finalMockCount: finalResponses.length,
      indexFilePath,
    });

    console.log(
      `Individual response files and index file created in ${outputFolder}`
    );
  } catch (error) {
    logger.error('Error processing HAR file', {
      harFilePath,
      outputFolder,
      fileName,
      testName,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

function createMockFromUserInputForDefaultMocks(body) {
  try {
    logger.info('Creating mock from user input for default mocks', {
      url: body.url,
      method: body.method,
    });

    const mockId = uuid.v4();
    body.id = mockId;
    const defaultMockData = getDefaultMockData();
    let mock_test_dir = path.join(process.env.MOCK_DIR, 'defaultMocks');
    let mock_list_file = path.join(
      process.env.MOCK_DIR,
      'defaultMocks',
      '_mock_list.json'
    );
    const existResps = getDefaultMockData();
    let mock_file = path.join(mock_test_dir, `mock_${mockId}.json`);

    logger.debug('Default mock paths', {
      mock_test_dir,
      mock_list_file,
      mock_file,
    });

    if (!fs.existsSync(mock_test_dir)) {
      fs.mkdirSync(mock_test_dir);
      logger.debug('Created default mocks directory', { mock_test_dir });
    }

    if (defaultMockData.find((mock) => compareMockToMock(mock, body))) {
      logger.info('Duplicate entry found for default mocks', {
        url: body.url,
        method: body.method,
      });
      console.log('its duplicate entry for default mocks');
      return null;
    } else {
      logger.debug('New entry for default mocks', {
        url: body.url,
        method: body.method,
      });
      console.log('its new entry');
    }

    const responseSummaryRecord = {
      fileName: `mock_${mockId}.json`,
      method: body.method,
      postData: body.request.postData,
      url: body.url,
      id: mockId,
    };

    existResps.push(
      Object.assign({}, responseSummaryRecord, { fileContent: body })
    );

    existResps.forEach((element) => {
      delete element.fileContent;
    });

    fs.writeFileSync(mock_file, JSON.stringify(body, null, 2));
    logger.debug('Created mock file', { mock_file });

    // Create an index file with references to individual response files
    fs.writeFileSync(mock_list_file, JSON.stringify(existResps, null, 2));
    logger.debug('Updated mock list file', { mock_list_file });

    logger.info('Default mock created successfully', {
      mockId,
      url: body.url,
      method: body.method,
      totalDefaultMocks: existResps.length,
    });

    console.log(
      `Individual response files and index file created in ${mock_list_file}`
    );
  } catch (error) {
    logger.error('Error creating default mock', {
      url: body?.url,
      method: body?.method,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

async function createMockFromUserInputForTest(body, testName, avoidDuplicates) {
  try {
    logger.info('Creating mock from user input for test', {
      testName: testName || 'default',
      url: body.url,
      method: body.method,
      avoidDuplicates,
    });

    if (!testName) {
      logger.debug('No test name provided, creating default mock');
      return createMockFromUserInputForDefaultMocks(body);
    } else {
      const mockId = uuid.v4();
      body.id = mockId;
      let mock_test_dir = path.join(
        process.env.MOCK_DIR,
        `test_${nameToFolder(testName)}`
      );

      logger.debug('Test mock paths', {
        testName,
        mock_test_dir,
        mockId,
      });

      if (!fs.existsSync(mock_test_dir)) {
        fs.mkdirSync(mock_test_dir);
        logger.debug('Created test directory', { mock_test_dir });
      }

      let mock_list_file = path.join(mock_test_dir, '_mock_list.json');
      if (!fs.existsSync(mock_list_file)) {
        await fs.appendFile(mock_list_file, '', () => {
          logger.debug('Created mock list file', { mock_list_file });
          console.log('_mock_list.json file created successfully');
        });
      }

      const existResps = loadMockDataFromMockListFile(
        mock_test_dir,
        '_mock_list.json'
      );

      logger.debug('Loaded existing test responses', {
        testName,
        existingCount: existResps.length,
      });

      if (avoidDuplicates) {
        if (
          existResps.find((mock) =>
            compareMockToMock(mock.fileContent, body, true)
          )
        ) {
          logger.info('Duplicate entry found for test', {
            testName,
            url: body.url,
            method: body.method,
          });
          console.log(`its duplicate entry for the test ${testName}`);
          return null;
        } else {
          logger.debug('New entry for test', {
            testName,
            url: body.url,
            method: body.method,
          });
          console.log('its new entry');
        }
      }

      let mock_file = path.join(mock_test_dir, `mock_${mockId}.json`);

      const responseSummaryRecord = {
        fileName: `mock_${mockId}.json`,
        method: body.method,
        postData: body.request.postData,
        url: body.url,
        id: mockId,
      };

      existResps.push(
        Object.assign({}, responseSummaryRecord, { fileContent: body })
      );

      existResps.forEach((element) => {
        delete element.fileContent;
      });

      fs.writeFileSync(mock_file, JSON.stringify(body, null, 2));
      logger.debug('Created test mock file', { mock_file });

      // Create an index file with references to individual response files
      fs.writeFileSync(mock_list_file, JSON.stringify(existResps, null, 2));
      logger.debug('Updated test mock list file', { mock_list_file });

      logger.info('Test mock created successfully', {
        testName,
        mockId,
        url: body.url,
        method: body.method,
        totalTestMocks: existResps.length,
      });

      console.log(
        `Individual response files and index file created in ${mock_list_file}`
      );
    }
  } catch (error) {
    logger.error('Error creating test mock', {
      testName,
      url: body?.url,
      method: body?.method,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

module.exports = {
  processHAR,
  isSameRequest,
  createMockFromUserInputForTest,
};
