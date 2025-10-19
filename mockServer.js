const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const path = require('path');
const logger = require('./src/utils/Logger');
const {
  getDefaultMockData,
  processURL,
  loadMockData,
  nameToFolder,
  compareMockToRequest,
  getCompareRankMockToRequest,
  createIdMap,
} = require('./src/utils/MockUtils');
const { getTestByName } = require('./src/utils/TestUtils');

const app = express();

app.use(bodyParser.json());

app.all('*', (req, res) => {
  try {
    logger.info('Mock server request received', {
      method: req.method,
      url: req.originalUrl,
      path: req.path,
      query: req.query,
      body: req.body,
      headers: req.headers,
    });

    const mockDataObj = loadMockData();
    const mockData = mockDataObj.mocks;
    const testName = mockDataObj.testName;
    const defaultMockData = getDefaultMockData();
    const testMockIdMap = createIdMap(mockData);

    let served = false;
    let matchedMocks =
      mockData?.filter((mock) => {
        if (mock.fileContent.waitForPrevious && !served) {
          logger.debug('Skipping mock due to waitForPrevious', {
            mockId: mock.id,
            mockUrl: mock.fileContent.url,
            served,
          });
          return false;
        }
        if (mock.fileContent.waitFor) {
          const waitForMocks = mock.fileContent.waitFor.filter(
            (waitForMockId) => {
              const waitForMock = testMockIdMap[waitForMockId];
              return waitForMock && !waitForMock.fileContent.served;
            }
          );
          if (waitForMocks.length > 0) {
            return false;
          }
        }
        served = mock.fileContent.served;
        const isMatch = compareMockToRequest(mock, req);

        if (isMatch) {
          logger.debug('Found matching test mock', {
            mockId: mock.id,
            mockUrl: mock.fileContent.url,
            mockMethod: mock.fileContent.method,
            served: mock.fileContent.served,
          });
        }

        return isMatch;
      }) || [];

    let foundMock = matchedMocks.find((mock) => !mock.fileContent.served)
      ? matchedMocks.find((mock) => !mock.fileContent.served)
      : matchedMocks[matchedMocks.length - 1];

    if (foundMock) {
      logger.info('Found matching test mock', {
        mockId: foundMock.id,
        mockUrl: foundMock.fileContent.url,
        mockMethod: foundMock.fileContent.method,
        served: foundMock.fileContent.served,
      });
    } else {
      logger.debug('No matching test mock found, checking default mocks');

      foundMock = defaultMockData?.find((mock) => {
        const isMatch = compareMockToRequest(mock, req);
        return isMatch;
      });

      if (foundMock) {
        logger.info('Found matching default mock', {
          mockId: foundMock.id,
          mockUrl: foundMock.fileContent.url,
          mockMethod: foundMock.fileContent.method,
        });
      }
    }

    const test = getTestByName(testName);
    if (!foundMock && test.mode !== 'strict') {
      const mockRanks = {};
      mockData.forEach((tm) => {
        const rank = getCompareRankMockToRequest(tm, req);
        if (rank > 0) {
          mockRanks[tm.id] = rank;
        }
      });
      defaultMockData.forEach((tm) => {
        const rank = getCompareRankMockToRequest(tm, req);
        if (rank > 0) {
          mockRanks[tm.id] = rank;
        }
      });
      // Sort by rank to find the best match
      const sortedRanks = Object.entries(mockRanks).sort((a, b) => a[1] - b[1]);
      if (sortedRanks.length > 0) {
        const bestMockId = sortedRanks?.[0]?.[0];
        if (bestMockId) {
          foundMock = [...mockData, ...defaultMockData].find(
            (mock) => mock.id === bestMockId
          );
        }
      }
    }

    if (foundMock) {
      // Mark test mock as served if it's a test mock
      if (matchedMocks.length > 0) {
        foundMock.fileContent.served = true;
        const tetFilePath = path.join(
          process.env.MOCK_DIR,
          `test_${nameToFolder(testName)}`,
          `mock_${foundMock.id}.json`
        );

        try {
          fs.writeFileSync(
            tetFilePath,
            JSON.stringify(foundMock.fileContent, null, 2)
          );
          logger.debug('Updated mock served status', {
            mockId: foundMock.id,
            filePath: tetFilePath,
          });
        } catch (error) {
          logger.error('Error updating mock served status', {
            mockId: foundMock.id,
            filePath: tetFilePath,
            error: error.message,
          });
        }
      }

      const responseData = foundMock.fileContent;
      const delay = responseData.delay ? parseInt(responseData.delay) : 0;

      logger.info('Preparing mock response', {
        mockId: foundMock.id,
        status: responseData.response.status,
        hasFile: !!responseData.response.file,
        hasContent: !!responseData.response.content,
        delay: delay,
      });

      setTimeout(() => {
        try {
          const { content, headers, status, file } = responseData.response;

          if (file) {
            logger.info('Sending file response', {
              mockId: foundMock.id,
              file: file,
              status: status,
            });

            const filePath = path.join(
              process.env.MOCK_DIR,
              `test_${nameToFolder(testName)}`,
              '_files',
              file
            );

            logger.debug('File response details', {
              mockId: foundMock.id,
              file: file,
              filePath: filePath,
              headers: headers,
            });

            const headerKeys = Object.keys(headers);
            headerKeys.forEach((aKey) => {
              try {
                res.set(aKey, headers[aKey]);
              } catch (e) {
                logger.error('Error setting header for file response', {
                  mockId: foundMock.id,
                  header: aKey,
                  value: headers[aKey],
                  error: e.message,
                });
              }
            });

            res.status(status).sendFile(filePath);
          } else {
            logger.info('Sending content response', {
              mockId: foundMock.id,
              status: status,
              contentType: headers['content-type'],
            });

            const headerKeys = Object.keys(headers).filter(
              (aKey) =>
                !aKey.toLowerCase().includes('content-encoding') &&
                !aKey.toLowerCase().includes('transfer-encoding') &&
                !aKey.toLowerCase().includes('accept-encoding') &&
                !aKey.toLowerCase().includes('te')
            );

            headerKeys.forEach((aKey) => {
              try {
                res.set(aKey, headers[aKey]);
              } catch (e) {
                logger.error('Error setting header for content response', {
                  mockId: foundMock.id,
                  header: aKey,
                  value: headers[aKey],
                  error: e.message,
                });
              }
            });

            if (headers['content-type'] === 'image/png') {
              logger.debug('Sending PNG image response', {
                mockId: foundMock.id,
                contentLength: content?.length || 0,
              });
              var img = Buffer.from(content, 'base64');
              res.status(status).end(img);
            } else {
              if (content) {
                try {
                  logger.debug('Sending JSON response', {
                    mockId: foundMock.id,
                    contentLength: content.length,
                  });
                  res.status(status).json(JSON.parse(content));
                } catch (e) {
                  logger.debug('Sending text response', {
                    mockId: foundMock.id,
                    contentLength: content.length,
                  });
                  res.status(status).end(content);
                }
              } else {
                logger.debug('Sending empty response', {
                  mockId: foundMock.id,
                });
                res.status(status).end('');
              }
            }
          }

          logger.info('Mock response sent successfully', {
            mockId: foundMock.id,
            status: status,
            hasFile: !!file,
            hasContent: !!content,
          });
        } catch (error) {
          logger.error('Error sending mock response', {
            mockId: foundMock.id,
            error: error.message,
            stack: error.stack,
          });
          res.status(500).json({ error: 'Internal server error' });
        }
      }, delay);
    } else {
      logger.warn('No matching mock found', {
        method: req.method,
        url: req.originalUrl,
        testName: testName,
      });
      res.status(404).json({ error: 'Not found' });
    }
  } catch (e) {
    logger.error('Error in mock server request handler', {
      method: req.method,
      url: req.originalUrl,
      error: e.message,
      stack: e.stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = app;
