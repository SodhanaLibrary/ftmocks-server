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
      if (
        event.type === 'input' &&
        events[events.length - 1]?.type === 'input'
      ) {
        events[events.length - 1].value = event.value;
      } else {
        events.push(event);
      }
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
      const isUniqueElement = (selector) => {
        const elements = document.querySelectorAll(selector);
        return elements.length === 1 || elements.length === 0;
      };

      const isUniqueText = (text) => {
        // Escape special characters in text for use in XPath
        const escapedText = text.replace(/"/g, '\\"');
        const xpath = `//*[contains(text(), "${escapedText}")]`;
        const elements = document.evaluate(
          xpath,
          document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        );
        return elements.snapshotLength === 1;
      };

      const getBestSelectors = (element) => {
        const selectors = [];
        const excludeTagNames = ['script', 'style', 'link', 'meta', 'svg'];
        try {
          const tagName = element.tagName.toLowerCase();
          if (excludeTagNames.includes(tagName)) {
            return selectors;
          }
          if (element.id) {
            selectors.push({ type: 'locator', value: `#${element.id}` });
          }
          if (
            element.getAttribute('data-testid') &&
            isUniqueElement(
              `[data-testid='${element.getAttribute('data-testid')}']`
            )
          ) {
            selectors.push({
              type: 'locator',
              value: `[data-testid='${element.getAttribute('data-testid')}']`,
            });
          }
          if (
            element.getAttribute('data-id') &&
            isUniqueElement(`[data-id='${element.getAttribute('data-id')}']`)
          ) {
            selectors.push({
              type: 'locator',
              value: `[data-id='${element.getAttribute('data-id')}']`,
            });
          }
          if (
            element.getAttribute('data-action') &&
            isUniqueElement(
              `[data-action='${element.getAttribute('data-action')}']`
            )
          ) {
            selectors.push({
              type: 'locator',
              value: `[data-action='${element.getAttribute('data-action')}']`,
            });
          }
          if (
            element.getAttribute('data-cy') &&
            isUniqueElement(`[data-cy='${element.getAttribute('data-cy')}']`)
          ) {
            selectors.push({
              type: 'locator',
              value: `[data-cy="${element.getAttribute('data-cy')}"]`,
            });
          }
          if (
            element.name &&
            tagName === 'input' &&
            (element.type === 'text' || element.type === 'password') &&
            isUniqueElement(`[name='${element.name}']`)
          ) {
            selectors.push({
              type: 'locator',
              value: `[name="${element.name}"]`,
            });
          } else if (
            element.name &&
            tagName === 'input' &&
            (element.type === 'checkbox' || element.type === 'radio') &&
            isUniqueElement(
              `[name='${element.name}'][value='${element.value}']`
            )
          ) {
            selectors.push({
              type: 'locator',
              value: `[name="${element.name}"][value="${element.value}"]`,
            });
          }
          if (
            element.ariaLabel &&
            isUniqueElement(`[aria-label='${element.ariaLabel}']`)
          ) {
            selectors.push({
              type: 'locator',
              value: `[aria-label="${element.ariaLabel}"]`,
            });
          }
          if (
            element.role &&
            element.name &&
            isUniqueElement(`[role='${element.role}'][name='${element.name}']`)
          ) {
            selectors.push({
              type: 'locator',
              value: `[role='${element.role}'][name='${element.name}']`,
            });
          }
          if (
            element.src &&
            isUniqueElement(`${tagName}[src='${element.src}']`)
          ) {
            selectors.push({
              type: 'locator',
              value: `${tagName}[src='${element.src}']`,
            });
          }
          if (
            element.href &&
            isUniqueElement(`${tagName}[href='${element.href}']`)
          ) {
            selectors.push({
              type: 'locator',
              value: `${tagName}[href='${element.href}']`,
            });
          }
          if (
            element.role &&
            element.textContent &&
            isUniqueText(element.textContent)
          ) {
            selectors.push({
              type: 'text',
              value: {
                role: element.role,
                textContent: element.textContent,
              },
            });
          }
          if (element.textContent && isUniqueText(element.textContent)) {
            selectors.push({
              type: 'text',
              value: {
                tagName,
                textContent: element.textContent,
              },
            });
          }
          console.log('selectors: ', selectors, element);
          return selectors;
        } catch (error) {
          console.error('Error getting best selectors', {
            error: error.message,
            stack: error.stack,
          });
          console.log('selectors: ', selectors, element);
          return selectors;
        }
      };

      const generateXPathWithNearestParentId = (element) => {
        try {
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

            let nextSibling = element.nextElementSibling;
            let usedNextSibling = false;
            while (nextSibling) {
              if (nextSibling.tagName.toLowerCase() === tagName) {
                usedNextSibling = true;
                break;
              }
              nextSibling = nextSibling.nextElementSibling;
            }

            if (index === 1) {
              if (usedNextSibling) {
                path = `/${tagName}[1]${path}`;
              } else {
                path = `/${tagName}${path}`;
              }
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
        } catch (error) {
          console.error('Error generating XPath with nearest parent ID', {
            error: error.message,
            stack: error.stack,
          });
          return null;
        }
      };

      const getParentElementWithEventOrId = (event, eventType) => {
        let target = event.target;
        const clickableTagNames = [
          'button',
          'a',
          'input',
          'option',
          'details',
          'summary',
          'select',
        ];

        while (target && target !== document) {
          // Check if the target is a clickable element
          // Check for test attributes and accessibility attributes
          const selectors = getBestSelectors(target);
          if (selectors.length > 0) {
            return target;
          } else if (target.getAttribute('id')) {
            return target;
          } else if (
            target.getAttribute(eventType) ||
            target[eventType] ||
            target.getAttribute(`on${eventType}`) ||
            target.getAttribute(`${eventType}`) ||
            target.getAttribute(
              `${eventType.charAt(0).toUpperCase() + eventType.slice(1)}`
            )
          ) {
            return target;
          } else if (clickableTagNames.includes(target.tagName.toLowerCase())) {
            return target;
          }
          target = target.parentNode;
        }
        return event.target;
      };

      const getElement = (target) => {
        return {
          tagName: target.tagName,
          textContent:
            target.textContent?.length > 0 && target.textContent?.length < 100
              ? target.textContent
              : null,
          id: target.id,
          role: target.role,
          name: target.name,
          ariaLabel: target.ariaLabel,
          value: target.value,
          type: target.type,
          checked: target.checked,
          selected: target.selected,
          disabled: target.disabled,
          readonly: target.readonly,
          placeholder: target.placeholder,
          title: target.title,
          href: target.href,
          src: target.src,
          alt: target.alt,
        };
      };

      document.addEventListener('click', (event) => {
        const currentTarget = getParentElementWithEventOrId(event, 'onclick');
        const selectors = getBestSelectors(currentTarget);
        window.saveEventForTest({
          type: 'click',
          target: generateXPathWithNearestParentId(currentTarget),
          time: new Date().toISOString(),
          value: {
            clientX: event.clientX,
            clientY: event.clientY,
          },
          selectors,
          element: getElement(currentTarget),
        });
      });
      document.addEventListener('dblclick', (event) => {
        const currentTarget = getParentElementWithEventOrId(
          event,
          'ondblclick'
        );
        window.saveEventForTest({
          type: 'dblclick',
          target: generateXPathWithNearestParentId(currentTarget),
          time: new Date().toISOString(),
          value: {
            clientX: event.clientX,
            clientY: event.clientY,
          },
          selectors: getBestSelectors(currentTarget),
          element: getElement(currentTarget),
        });
      });
      document.addEventListener('contextmenu', (event) => {
        const currentTarget = getParentElementWithEventOrId(
          event,
          'oncontextmenu'
        );
        window.saveEventForTest({
          type: 'contextmenu',
          target: generateXPathWithNearestParentId(currentTarget),
          time: new Date().toISOString(),
          value: {
            clientX: event.clientX,
            clientY: event.clientY,
          },
          selectors: getBestSelectors(currentTarget),
          element: getElement(currentTarget),
        });
      });
      document.addEventListener('input', (event) => {
        const currentTarget = getParentElementWithEventOrId(event, 'oninput');
        if (event.target && event.target.tagName === 'INPUT') {
          window.saveEventForTest({
            type: 'input',
            target: generateXPathWithNearestParentId(currentTarget),
            time: new Date().toISOString(),
            value: event.target.value,
            selectors: getBestSelectors(currentTarget),
            element: getElement(currentTarget),
          });
        }
      });
      document.addEventListener('change', (event) => {
        const currentTarget = getParentElementWithEventOrId(event, 'onchange');
        window.saveEventForTest({
          type: 'change',
          target: generateXPathWithNearestParentId(currentTarget),
          time: new Date().toISOString(),
          value: event.target.value,
          selectors: getBestSelectors(currentTarget),
          element: getElement(currentTarget),
        });
      });
      // document.addEventListener('submit', (event) => {
      //   event.preventDefault();
      //   const currentTarget = getParentElementWithEventOrId(event, 'onsubmit');
      //   const formData = new FormData(event.target);
      //   const entries = {};
      //   formData.forEach((value, key) => {
      //     entries[key] = value;
      //   });
      //   window.saveEventForTest({
      //     type: 'submit',
      //     target: generateXPathWithNearestParentId(currentTarget),
      //     time: new Date().toISOString(),
      //     value: entries,
      //     selectors: getBestSelectors(currentTarget),
      //     element: getElement(currentTarget),
      //   });
      // });
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
