const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const logger = require('./Logger');
const {
  nameToFolder,
  compareMockToMock,
  loadMockDataFromMockListFile,
} = require('./MockUtils');
const { stripServedFromMock } = require('./ServedUtils');
const { saveIfItIsFile } = require('./FileUtils');

const excludeHeaders = (headers) => {
  if (!process.env.EXCLUDED_HEADERS) {
    return headers;
  }
  process.env.EXCLUDED_HEADERS.split(',').forEach((header) => {
    Object.keys(headers).forEach((key) => {
      if (key.toLowerCase() === header.toLowerCase()) {
        delete headers[key];
      }
    });
  });
  return headers;
};

/** Build baseURL and httpCredentials from env when set; otherwise {}. */
const getContextOptionsFromEnv = () => {
  const baseURL = process.env.BASE_URL;
  const username = process.env.HTTP_CREDENTIALS_USERNAME;
  const password = process.env.HTTP_CREDENTIALS_PASSWORD;
  const hasCredentials = username && password;
  if (!baseURL && !hasCredentials) return {};
  const options = {};
  if (baseURL) options.baseURL = baseURL;
  if (hasCredentials) options.httpCredentials = { username, password };
  return options;
};

/**
 * Attach the same network interception + mock persistence used by POST /api/v1/record/mocks
 * to all pages in a Playwright BrowserContext (e.g. normal recording or codegen).
 *
 * @param {import('playwright').BrowserContext} context
 * @param {object} recordingOptions
 * @param {string} [recordingOptions.testName]
 * @param {string[]} [recordingOptions.patterns]
 * @param {boolean} [recordingOptions.avoidDuplicatesInTheTest]
 * @param {boolean} [recordingOptions.avoidDuplicatesWithDefaultMocks]
 */
async function attachNetworkMockRecording(context, recordingOptions) {
  const {
    testName,
    patterns = [],
    avoidDuplicatesInTheTest,
    avoidDuplicatesWithDefaultMocks,
  } = recordingOptions;

  await context.route('**', async (route) => {
    const currentRequest = route.request();
    let response = null;
    try {
      const urlObj = new URL(currentRequest.url());
      if (patterns && patterns.length > 0) {
        const matchesPattern = patterns.some((pattern) => {
          try {
            const patternRegex = new RegExp(pattern);
            return patternRegex.test(urlObj.pathname);
          } catch (error) {
            logger.warn('Invalid regex pattern', {
              pattern,
              error: error.message,
            });
            return false;
          }
        });

        if (!matchesPattern) {
          logger.debug('Route skipped - no pattern matches', {
            url: urlObj.pathname,
            patterns,
          });
          await route.continue();
          return;
        }
      }

      logger.debug('Processing route', {
        url: urlObj.pathname,
        method: currentRequest.method(),
      });

      const id = crypto.randomUUID();
      response = await route.fetch();
      const fileName = await saveIfItIsFile(
        currentRequest,
        response,
        testName,
        id
      );
      try {
        const mockData = {
          url: urlObj.pathname + urlObj.search,
          time: new Date().toString(),
          method: currentRequest.method(),
          request: {
            headers: excludeHeaders(await currentRequest.headers()),
            queryString: Array.from(urlObj.searchParams.entries()).map(
              ([name, value]) => ({
                name,
                value,
              })
            ),
            postData: currentRequest.postData()
              ? {
                  mimeType: 'application/json',
                  text: currentRequest.postData(),
                }
              : null,
          },
          response: {
            file: fileName,
            status: response.status(),
            headers: excludeHeaders(response.headers()),
            content: fileName ? null : await response.text(),
          },
          id,
          ignoreParams: process.env.DEFAULT_IGNORE_PARAMS
            ? process.env.DEFAULT_IGNORE_PARAMS.split(',')
            : [],
        };

        if (avoidDuplicatesInTheTest) {
          logger.debug('Checking for duplicates in test', { testName });
          const testMockList = loadMockDataFromMockListFile(
            path.join(
              process.env.MOCK_DIR,
              testName ? `test_${nameToFolder(testName)}` : 'defaultMocks'
            ),
            `_mock_list.json`
          );
          const matchResponse = testMockList.find((mock) =>
            compareMockToMock(mock.fileContent, mockData, true)
          );
          if (matchResponse) {
            logger.info('Replacing duplicate mock data in the test', {
              existingId: matchResponse.id,
              newId: mockData.id,
            });
            const existingMockDataFile = path.join(
              process.env.MOCK_DIR,
              testName ? `test_${nameToFolder(testName)}` : 'defaultMocks',
              `mock_${matchResponse.id}.json`
            );
            fs.writeFileSync(
              existingMockDataFile,
              JSON.stringify(mockData, null, 2)
            );
            await route.fulfill({
              status: response.status(),
              headers: response.headers(),
              body: await response.body(),
            });
            return;
          }
        }

        if (avoidDuplicatesWithDefaultMocks) {
          logger.debug('Checking for duplicates with default mocks');
          const defaultMockList = loadMockDataFromMockListFile(
            path.join(
              process.env.MOCK_DIR,
              testName ? `test_${nameToFolder(testName)}` : 'defaultMocks'
            ),
            `_mock_list.json`
          );
          const matchResponse = defaultMockList.find((mock) =>
            compareMockToMock(mock.fileContent, mockData, true)
          );
          if (matchResponse) {
            logger.info('Aborting duplicate mock data with default mocks', {
              defaultMockId: matchResponse.id,
            });
            await route.fulfill({
              status: response.status(),
              headers: response.headers(),
              body: await response.body(),
            });
            return;
          }
        }

        const mockListPath = path.join(
          process.env.MOCK_DIR,
          testName ? `test_${nameToFolder(testName)}` : 'defaultMocks',
          '_mock_list.json'
        );
        let mockList = [];
        if (fs.existsSync(mockListPath)) {
          mockList = JSON.parse(fs.readFileSync(mockListPath, 'utf8'));
        }
        mockList.push({
          id: mockData.id,
          url: mockData.url,
          method: mockData.method,
          time: mockData.time,
        });

        fs.writeFileSync(mockListPath, JSON.stringify(mockList, null, 2));
        const mocDataPath = path.join(
          process.env.MOCK_DIR,
          testName ? `test_${nameToFolder(testName)}` : 'defaultMocks',
          `mock_${mockData.id}.json`
        );
        fs.writeFileSync(mocDataPath, JSON.stringify(stripServedFromMock(mockData), null, 2));

        logger.info('Mock data saved successfully', {
          mockId: mockData.id,
          url: mockData.url,
          method: mockData.method,
          status: mockData.response.status,
        });
      } catch (error) {
        logger.error('Error saving mock data', {
          error: error.message,
          stack: error.stack,
          url: currentRequest.url(),
        });
      } finally {
        await route.fulfill({
          status: response.status(),
          headers: response.headers(),
          body: await response.body(),
        });
      }
    } catch (error) {
      logger.error('Error processing route', {
        error: error.message,
        stack: error.stack,
        url: currentRequest.url(),
      });
      if (!response) {
        await route.continue();
      } else {
        await route.fulfill({
          status: response.status(),
          headers: response.headers(),
          body: await response.body(),
        });
      }
    }
  });
}

module.exports = {
  attachNetworkMockRecording,
  getContextOptionsFromEnv,
};
