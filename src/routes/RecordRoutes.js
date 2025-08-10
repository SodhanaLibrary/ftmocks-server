const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');
const logger = require('../utils/Logger');
const {
  nameToFolder,
  compareMockToMock,
  loadMockDataFromMockListFile,
} = require('../utils/MockUtils');

const injectEventRecordingScript = async (page, url) => {
  try {
    const eventsFile = path.join(
      process.env.MOCK_DIR,
      `test_${nameToFolder(process.env.recordTest)}`,
      `_events.json`
    );

    // Expose a function to receive click info from the browser
    await page.exposeFunction('saveEventForTest', (event) => {
      event.id = crypto.randomUUID();
      const events = JSON.parse(fs.readFileSync(eventsFile, 'utf8'));
      events.push(event);
      fs.writeFileSync(eventsFile, JSON.stringify(events, null, 2));
    });

    fs.writeFileSync(
      eventsFile,
      JSON.stringify(
        [
          {
            id: crypto.randomUUID(),
            type: 'url',
            target: url,
            time: new Date().toISOString(),
            value: url,
          },
        ],
        null,
        2
      )
    );
    await page.addInitScript(() => {
      const generateXPathWithNearestParentId = (element) => {
        let path = '';
        let nearestParentId = null;

        // Check if the current element's has an ID
        if (element.id) {
          nearestParentId = element.id;
        }

        while (!nearestParentId && element !== document.body && element) {
          const tagName = element.tagName.toLowerCase();
          let index = 1;
          let sibling = element.previousElementSibling;

          while (sibling) {
            if (sibling.tagName.toLowerCase() === tagName) {
              index += 1;
            }
            sibling = sibling.previousElementSibling;
          }

          if (index === 1) {
            path = `/${tagName}${path}`;
          } else {
            path = `/${tagName}[${index}]${path}`;
          }

          // Check if the current element's parent has an ID
          if (element.parentElement && element.parentElement.id) {
            nearestParentId = element.parentElement.id;
            break; // Stop searching when we find the nearest parent with an ID
          }

          element = element.parentElement;
        }

        if (nearestParentId) {
          path = `//*[@id='${nearestParentId}']${path}`;
          return path;
        }
        return null; // No parent with an ID found
      };

      const getParentElementWithEvent = (event, eventType) => {
        let depth = 5;
        let target = event.target;
        while (target && target !== document && depth > 0) {
          if (target.getAttribute(eventType) || target[eventType]) {
            return target;
          }
          target = target.parentNode;
          depth -= 1;
        }
        return event.target;
      };

      document.addEventListener('click', (event) => {
        window.saveEventForTest({
          type: 'click',
          target: generateXPathWithNearestParentId(
            getParentElementWithEvent(event, 'onclick')
          ),
          time: new Date().toISOString(),
          value: {
            clientX: event.clientX,
            clientY: event.clientY,
          },
        });
      });
      document.addEventListener('dblclick', (event) => {
        window.saveEventForTest({
          type: 'dblclick',
          target: generateXPathWithNearestParentId(
            getParentElementWithEvent(event, 'ondblclick')
          ),
          time: new Date().toISOString(),
          value: {
            clientX: event.clientX,
            clientY: event.clientY,
          },
        });
      });
      document.addEventListener('contextmenu', (event) => {
        window.saveEventForTest({
          type: 'contextmenu',
          target: generateXPathWithNearestParentId(
            getParentElementWithEvent(event, 'oncontextmenu')
          ),
          time: new Date().toISOString(),
          value: {
            clientX: event.clientX,
            clientY: event.clientY,
          },
        });
      });
      document.addEventListener('input', (event) => {
        if (event.target && event.target.tagName === 'INPUT') {
          window.saveEventForTest({
            type: 'input',
            target: generateXPathWithNearestParentId(
              getParentElementWithEvent(event, 'oninput')
            ),
            time: new Date().toISOString(),
            value: event.target.value,
          });
        }
      });
      document.addEventListener('change', (event) => {
        window.saveEventForTest({
          type: 'change',
          target: generateXPathWithNearestParentId(
            getParentElementWithEvent(event, 'onchange')
          ),
          time: new Date().toISOString(),
          value: event.target.value,
        });
      });
      document.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);
        const entries = {};
        formData.forEach((value, key) => {
          entries[key] = value;
        });
        window.saveEventForTest({
          type: 'submit',
          target: generateXPathWithNearestParentId(
            getParentElementWithEvent(event, 'onsubmit')
          ),
          time: new Date().toISOString(),
          value: entries,
        });
      });
      document.addEventListener('popstate', () => {
        window.saveEventForTest({
          type: 'url',
          target: window.location.pathname,
          time: new Date().toISOString(),
          value: window.location.href,
        });
      });

      // Also track URL changes via history API
      const originalPushState = window.history.pushState;
      window.history.pushState = function () {
        originalPushState.apply(this, arguments);
        window.saveEventForTest({
          type: 'url',
          target: window.location.pathname,
          time: new Date().toISOString(),
          value: window.location.href,
        });
      };

      const originalReplaceState = window.history.replaceState;
      window.history.replaceState = function () {
        originalReplaceState.apply(this, arguments);
        window.saveEventForTest({
          type: 'url',
          target: window.location.pathname,
          time: new Date().toISOString(),
          value: window.location.href,
        });
      };
    });

    logger.info('Event recording script injected successfully');
  } catch (error) {
    logger.error('Error injecting event recording script', {
      error: error.message,
      stack: error.stack,
    });
  }
};

const saveIfItIsFile = async (route, testName, id) => {
  try {
    const urlObj = new URL(route.request().url());

    // Check if URL contains file extension like .js, .png, .css etc
    const fileExtMatch = urlObj.pathname.match(/\.[a-zA-Z0-9]+$/);
    if (fileExtMatch) {
      const fileExt = fileExtMatch[0];
      logger.debug(`Processing file request: ${urlObj.pathname}`, {
        fileExt,
        testName,
      });

      // Create directory path matching URL structure
      const dirPath = path.join(
        process.env.MOCK_DIR,
        `test_${nameToFolder(testName)}`,
        '_files'
      );

      // Create directories if they don't exist
      fs.mkdirSync(dirPath, { recursive: true });

      // Save file with original name
      const fileName = `${id}${fileExt}`;
      const filePath = path.join(dirPath, fileName);

      const response = await route.fetch();
      const buffer = await response.body();
      fs.writeFileSync(filePath, buffer);

      logger.info(`File saved successfully: ${fileName}`, {
        originalPath: urlObj.pathname,
        savedPath: filePath,
        fileSize: buffer.length,
      });

      return fileName;
    }
    return false;
  } catch (error) {
    logger.error('Error saving file', {
      error: error.message,
      url: route.request().url(),
      testName,
    });
    return false;
  }
};

const recordMocks = async (browser, req, res) => {
  try {
    logger.info('Starting mock recording', {
      url: req.body.url,
      testName: req.body.testName,
      pattern: req.body.pattern,
      recordEvents: req.body.recordEvents,
      avoidDuplicatesInTheTest: req.body.avoidDuplicatesInTheTest,
      avoidDuplicatesWithDefaultMocks: req.body.avoidDuplicatesWithDefaultMocks,
    });

    // Configure browser context with user data directory
    const browserContext = {
      args: ['--disable-web-security'],
    };

    const context = await browser.newContext(browserContext);
    const page = await context.newPage();

    logger.info('Browser context and page created');

    // Set default timeout to 30 seconds
    page.setDefaultTimeout(60000);
    const url = req.body.url; // Predefined URL
    const testName = req.body.testName;
    const pattern = req.body.pattern;
    process.env.recordTest = testName;
    process.env.recordMocks = testName;

    // Spy on fetch API calls
    await page.route('**', async (route) => {
      try {
        // Convert pattern string to RegExp
        const urlObj = new URL(route.request().url());
        if (pattern && pattern.length > 0) {
          const patternRegex = new RegExp(pattern);
          if (!patternRegex.test(urlObj.pathname)) {
            logger.debug('Route skipped - pattern mismatch', {
              url: urlObj.pathname,
              pattern,
            });
            await route.continue();
            return;
          }
        }

        logger.debug('Processing route', {
          url: urlObj.pathname,
          method: route.request().method(),
        });

        const id = crypto.randomUUID();
        const fileName = await saveIfItIsFile(route, testName, id);
        const response = await route.fetch();

        const mockData = {
          url: urlObj.pathname + urlObj.search,
          time: new Date().toString(),
          method: route.request().method(),
          request: {
            headers: await route.request().headers(),
            queryString: Array.from(urlObj.searchParams.entries()).map(
              ([name, value]) => ({
                name,
                value,
              })
            ),
            postData: route.request().postData()
              ? {
                  mimeType: 'application/json',
                  text: route.request().postData(),
                }
              : null,
          },
          response: {
            file: fileName,
            status: response.status(),
            headers: response.headers(),
            content: fileName ? null : await response.text(),
          },
          id,
          served: false,
          ignoreParams: process.env.DEFAULT_IGNORE_PARAMS
            ? process.env.DEFAULT_IGNORE_PARAMS.split(',')
            : [],
        };

        if (req.body.avoidDuplicatesInTheTest) {
          logger.debug('Checking for duplicates in test', { testName });
          // Check if the mock data is a duplicate of a mock data in the test
          const testMockList = loadMockDataFromMockListFile(
            path.join(process.env.MOCK_DIR, `test_${nameToFolder(testName)}`),
            `_mock_list.json`,
            testName
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
              `test_${nameToFolder(testName)}`,
              `mock_${matchResponse.id}.json`
            );
            fs.writeFileSync(
              existingMockDataFile,
              JSON.stringify(mockData, null, 2)
            );
            await route.continue();
            return;
          }
        }

        if (req.body.avoidDuplicatesWithDefaultMocks) {
          logger.debug('Checking for duplicates with default mocks');
          // Check if the mock data is a duplicate of a mock data in the test
          const defaultMockList = loadMockDataFromMockListFile(
            process.env.MOCK_DIR,
            `default.json`
          );
          const matchResponse = defaultMockList.find((mock) =>
            compareMockToMock(mock.fileContent, mockData, true)
          );
          if (matchResponse) {
            logger.info('Aborting duplicate mock data with default mocks', {
              defaultMockId: matchResponse.id,
            });
            await route.continue();
            return;
          }
        }

        // Save the mock data to the test
        const mockListPath = path.join(
          process.env.MOCK_DIR,
          `test_${nameToFolder(testName)}`,
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
          `test_${nameToFolder(testName)}`,
          `mock_${mockData.id}.json`
        );
        fs.writeFileSync(mocDataPath, JSON.stringify(mockData, null, 2));

        logger.info('Mock data saved successfully', {
          mockId: mockData.id,
          url: mockData.url,
          method: mockData.method,
          status: mockData.response.status,
        });

        await route.continue();
      } catch (error) {
        logger.error('Error processing route', {
          error: error.message,
          stack: error.stack,
          url: route.request().url(),
        });
        await route.continue();
      }
    });

    // Inject script to log various user interactions
    if (req.body.recordEvents) {
      logger.info('Enabling event recording');
      await injectEventRecordingScript(page, url);
    }

    logger.info('Navigating to URL', { url });
    await page.goto(url);
    logger.info('Successfully navigated to URL', { url });

    logger.info('Mock recording setup completed successfully');

    // Handle browser close event
    context.on('close', () => {
      logger.info('Browser context closed for test recording', {
        testName,
        url,
      });
      process.env.recordMocks = null;
      process.env.recordTest = null;
    });

    res.json({
      success: true,
      message: 'Mock recording started successfully',
    });
  } catch (error) {
    logger.error('Error in recordMocks', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: 'Internal server error',
    });
  }
};

const recordTest = async (browser, req, res) => {
  try {
    logger.info('Starting test recording', {
      url: req.body.url,
      testName: req.body.testName,
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    logger.info('Browser context and page created for test recording');

    const url = req.body.url; // Predefined URL
    const testName = req.body.testName;
    process.env.recordTest = testName;

    // Inject script to log various user interactions
    if (req.body.recordEvents) {
      logger.info('Enabling event recording');
      await injectEventRecordingScript(page, url);
    }
    logger.info('Navigating to URL for test recording', { url });
    await page.goto(url);
    logger.info('Successfully navigated to URL for test recording', { url });

    logger.info('Test recording setup completed successfully');

    // Handle browser close event
    context.on('close', () => {
      logger.info('Browser context closed for test recording', {
        testName,
        url,
      });
      process.env.recordTest = null;
      browser.close();
    });

    res.json({
      success: true,
      message: 'Test recording started successfully',
    });
  } catch (error) {
    logger.error('Error in recordTest', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: 'Internal server error',
    });
  }
};

module.exports = {
  recordMocks,
  recordTest,
};
