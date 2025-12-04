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
const { addUrlToProject } = require('../utils/projectUtils');
const { saveIfItIsFile } = require('../utils/FileUtils');

const injectEventRecordingScript = async (
  page,
  url,
  options = {
    recordEvents: true,
    recordScreenshots: false,
    recordVideos: false,
  }
) => {
  try {
    const eventsFile = path.join(
      process.env.MOCK_DIR,
      `test_${nameToFolder(process.env.recordTest)}`,
      `_events.json`
    );
    if (!fs.existsSync(eventsFile)) {
      // Ensure the directory exists before writing the eventsFile
      const dir = path.dirname(eventsFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(eventsFile, JSON.stringify([], null, 2));
    }

    const takeScreenshot = async (imgOptions) => {
      if (!options.recordScreenshots) {
        return;
      }
      const screenshot = await page.screenshot({ fullPage: false });
      const screenshotsDir = path.join(
        process.env.MOCK_DIR,
        `test_${nameToFolder(process.env.recordTest)}`,
        'screenshots'
      );
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }
      const screenshotFile = path.join(
        process.env.MOCK_DIR,
        `test_${nameToFolder(process.env.recordTest)}`,
        'screenshots',
        `screenshot_${imgOptions.name}.png`
      );
      fs.writeFileSync(screenshotFile, screenshot);
      return screenshotFile;
    };
    // Expose a function to receive click info from the browser
    await page.exposeFunction('saveEventForTest', async (event) => {
      if (!options.recordEvents) {
        return;
      }
      event.id = crypto.randomUUID();
      if (!fs.existsSync(eventsFile)) {
        // Ensure the directory exists before writing the eventsFile
        const dir = path.dirname(eventsFile);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(eventsFile, JSON.stringify([], null, 2));
      }
      const events = JSON.parse(fs.readFileSync(eventsFile, 'utf8'));
      if (
        event.type === 'input' &&
        events[events.length - 1]?.type === 'input'
      ) {
        events[events.length - 1].value = event.value;
        await takeScreenshot({ name: events[events.length - 1].id });
      } else {
        events.push(event);
        await takeScreenshot({ name: event.id });
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
      let prevEventSnapshot = null;
      let currentEventSnapshot = null;

      const getAbsoluteXPath = (element) => {
        if (element === document.body) return '/html/body';
        const svgTagNames = [
          'svg',
          'path',
          'rect',
          'circle',
          'ellipse',
          'line',
          'polygon',
          'polyline',
          'text',
          'tspan',
        ];

        let xpath = '';
        for (
          ;
          element && element.nodeType === 1;
          element = element.parentNode
        ) {
          let index = 0;
          let sibling = element;
          while ((sibling = sibling.previousSibling)) {
            if (sibling.nodeType === 1 && sibling.nodeName === element.nodeName)
              index++;
          }
          const tagName = element.nodeName.toLowerCase();
          const position = index ? `[${index + 1}]` : '';
          xpath =
            '/' +
            (svgTagNames.includes(tagName)
              ? `*[local-name()='${tagName}']`
              : tagName) +
            position +
            xpath;
        }

        return xpath;
      };

      const filterElementsFromHtml = (html = '', selector) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const elements = doc.querySelectorAll(selector);
        return elements;
      };

      const filterXpathElementsFromHtml = (html, xpath) => {
        try {
          const doc = new DOMParser().parseFromString(html, 'text/html');
          // The elements variable should be an array, not an XPathResult snapshot. Convert the snapshot to an array of elements.
          const snapshot = doc.evaluate(
            xpath,
            doc,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
          );
          const elements = [];
          for (let i = 0; i < snapshot.snapshotLength; i++) {
            elements.push(snapshot.snapshotItem(i));
          }
          return elements;
        } catch (error) {
          console.error('Error filtering XPath elements from HTML', {
            error: error.message,
            stack: error.stack,
          });
          return [];
        }
      };

      const getElementsByRank = (elements, mainElement) => {
        const ranksAndIndexes = [];

        for (let i = 0; i < elements.length; i++) {
          // Compare element with mainElement based on attributes and textContent
          let rank = 1;
          const e = elements[i];
          if (e && mainElement) {
            if (e.attributes && mainElement.attributes) {
              if (e.attributes.length !== mainElement.attributes.length) {
                rank =
                  rank +
                  Math.abs(e.attributes.length - mainElement.attributes.length);
              }
              for (let j = 0; j < e.attributes.length; j++) {
                const attrName = e.attributes[j].name;
                if (
                  e.getAttribute(attrName) &&
                  mainElement.getAttribute(attrName) &&
                  e.getAttribute(attrName) !==
                    mainElement.getAttribute(attrName)
                ) {
                  rank = rank + 1;
                }
              }
            }

            if (e.textContent === mainElement.textContent) {
              rank = rank + 1;
            }
            // Compare node depth in the DOM tree
            const getDepth = (node) => {
              let depth = 0;
              let current = node;
              while (current && current.parentNode) {
                depth++;
                current = current.parentNode;
              }
              return depth;
            };

            if (e && mainElement) {
              const eDepth = getDepth(e);
              const mainDepth = getDepth(mainElement);
              rank = rank + Math.abs(eDepth - mainDepth);
            }
          }
          ranksAndIndexes.push({ index: i, rank });
        }
        return ranksAndIndexes.sort((a, b) => a.rank - b.rank);
      };

      const isUniqueXpath = (xpath) => {
        try {
          const elements = document.evaluate(
            xpath,
            document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
          );
          return elements.snapshotLength === 1;
        } catch (error) {
          console.error('Error checking if XPath is unique', {
            error: error.message,
            stack: error.stack,
          });
          return true;
        }
      };
      const getUniqueXpath = (xpath, mainElement) => {
        const prevElements = filterXpathElementsFromHtml(
          prevEventSnapshot,
          xpath
        );
        if (prevElements.snapshotLength > 1 && mainElement) {
          return `(${xpath})[${getElementsByRank(prevElements, mainElement)[0].index + 1}]`;
        }
        return xpath;
      };

      const getUniqueElementSelectorNth = (selector, mainElement) => {
        const prevElements = filterElementsFromHtml(
          prevEventSnapshot,
          selector
        );
        if (prevElements.length > 1) {
          return getElementsByRank(prevElements, mainElement)[0].index + 1;
        }
        return 1;
      };

      const getSelectorsByConfidence = (selectors) => {
        const selectorCounts = selectors.map((selector) => {
          if (selector.value.startsWith('/')) {
            const prevElements = filterXpathElementsFromHtml(
              prevEventSnapshot,
              selector.value
            );
            const nextElements = filterXpathElementsFromHtml(
              currentEventSnapshot,
              selector.value
            );
            return {
              selector: selector.value,
              type: selector.type,
              count: prevElements.length + nextElements.length,
            };
          } else {
            const prevElements = filterElementsFromHtml(
              prevEventSnapshot,
              selector.value
            );
            const nextElements = filterElementsFromHtml(
              currentEventSnapshot,
              selector.value
            );
            return {
              selector: selector.value,
              type: selector.type,
              count: prevElements.length + nextElements.length,
            };
          }
        });
        const zeroCountSelectors = selectorCounts
          .filter((selector) => selector.count === 0)
          .map((selector) => selector.selector);
        const nonZeroCountSelectors = selectorCounts
          .filter((selector) => selector.count > 0)
          .sort((selObj1, selObj2) => selObj1.count - selObj2.count)
          .map((selObj) => selObj.selector);
        return [...nonZeroCountSelectors, ...zeroCountSelectors];
      };

      const getBestSelectors = (element, event) => {
        const selectors = [];
        const excludeTagNames = ['script', 'style', 'link', 'meta'];
        const getTagName = (element) => {
          const svgTagNames = [
            'svg',
            'path',
            'rect',
            'circle',
            'ellipse',
            'line',
            'polygon',
            'polyline',
            'text',
            'tspan',
          ];
          if (svgTagNames.includes(element.tagName.toLowerCase())) {
            return `*[local-name()="${element.tagName.toLowerCase()}"]`;
          }
          return element.tagName.toLowerCase();
        };
        try {
          const tagName = getTagName(element);
          if (excludeTagNames.includes(tagName)) {
            return selectors;
          }
          if (element.getAttribute('data-testid')) {
            selectors.push({
              type: 'locator',
              value: getUniqueXpath(
                `//${tagName}[@data-testid='${element.getAttribute('data-testid')}']`,
                element
              ),
            });
          }
          if (element.getAttribute('data-id')) {
            selectors.push({
              type: 'locator',
              value: getUniqueXpath(
                `//${tagName}[@data-id='${element.getAttribute('data-id')}']`,
                element
              ),
            });
          }
          if (element.getAttribute('data-action')) {
            selectors.push({
              type: 'locator',
              value: getUniqueXpath(
                `//${tagName}[@data-action='${element.getAttribute('data-action')}']`,
                element
              ),
            });
          }
          if (element.getAttribute('data-cy')) {
            selectors.push({
              type: 'locator',
              value: getUniqueXpath(
                `//${tagName}[@data-cy='${element.getAttribute('data-cy')}']`,
                element
              ),
            });
          }
          if (
            element.name &&
            tagName === 'input' &&
            (element.type === 'text' || element.type === 'password')
          ) {
            selectors.push({
              type: 'locator',
              value: getUniqueXpath(
                `//${tagName}[@name='${element.name}']`,
                element
              ),
            });
          } else if (
            element.name &&
            tagName === 'input' &&
            (element.type === 'checkbox' || element.type === 'radio')
          ) {
            selectors.push({
              type: 'locator',
              value: getUniqueXpath(
                `//${tagName}[@name='${element.name}'][@value='${element.value}']`,
                element
              ),
            });
          }
          if (element.ariaLabel) {
            selectors.push({
              type: 'locator',
              value: getUniqueXpath(
                `//${tagName}[@aria-label='${element.ariaLabel}']`,
                element
              ),
            });
          }
          if (element.role && element.name) {
            selectors.push({
              type: 'locator',
              value: getUniqueXpath(
                `//${tagName}[@role='${element.role}'][@name='${element.name}']`,
                element
              ),
            });
          }
          if (element.getAttribute('src')) {
            selectors.push({
              type: 'locator',
              value: getUniqueXpath(
                `//${tagName}[@src='${element.getAttribute('src')}']`,
                element
              ),
            });
          }
          if (element.getAttribute('href')) {
            selectors.push({
              type: 'locator',
              value: getUniqueXpath(
                `//${tagName}[@href='${element.getAttribute('href')}']`,
                element
              ),
            });
          }
          const escapedText = element.textContent
            .replace(/'/g, "\\'")
            .replace(/\s+/g, ' ')
            .trim();
          if (element.role && element.textContent) {
            selectors.push({
              type: 'locator',
              value: getUniqueXpath(
                `//${tagName}[@role='${element.role}' and normalize-space(.) = '${escapedText}']`,
                element
              ),
            });
          }
          if (
            event?.target?.textContent?.length > 0 &&
            event?.target?.textContent?.length < 200
          ) {
            selectors.push({
              type: 'locator',
              value: getUniqueXpath(
                `//*[normalize-space(text())='${event.target.textContent.replace(/'/g, "\\'").replace(/\s+/g, ' ').trim()}']`,
                event.target
              ),
            });
          }
          return selectors;
        } catch (error) {
          console.error('Error getting best selectors', {
            error: error.message,
            stack: error.stack,
          });
          return selectors;
        }
      };

      const generateXPathWithNearestParentId = (element) => {
        const otherIdAttributes = [
          'data-id',
          'data-action',
          'data-testid',
          'data-cy',
          'data-role',
          'data-name',
          'data-label',
        ];
        try {
          let path = '';
          let nearestParentId = null;
          let nearestParentAttribute = null;
          let nearestParentAttributeValue = null;

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

            const svgTagNames = [
              'svg',
              'path',
              'rect',
              'circle',
              'ellipse',
              'line',
              'polygon',
              'polyline',
              'text',
              'tspan',
            ];
            let tempTagName = tagName;
            if (svgTagNames.includes(tagName)) {
              tempTagName = `*[local-name()='${tagName}']`;
            }
            if (index === 1) {
              if (usedNextSibling) {
                path = `/${tempTagName}[1]${path}`;
              } else {
                path = `/${tempTagName}${path}`;
              }
            } else {
              path = `/${tempTagName}[${index}]${path}`;
            }

            // Check if the current element's parent has an ID
            if (element.parentElement && element.parentElement.id) {
              nearestParentId = element.parentElement.id;
              break; // Stop searching when we find the nearest parent with an ID
            } else if (element.parentElement) {
              otherIdAttributes.forEach((attribute) => {
                const parentAttributeValue =
                  element.parentElement.getAttribute(attribute);
                if (
                  parentAttributeValue &&
                  isUniqueXpath(`//*[@${attribute}='${parentAttributeValue}']`)
                ) {
                  nearestParentAttribute = attribute;
                  nearestParentAttributeValue = parentAttributeValue;
                }
              });
              if (nearestParentAttribute && nearestParentAttributeValue) {
                break;
              }
            }

            element = element.parentElement;
          }

          if (nearestParentId) {
            path = `//*[@id='${nearestParentId}']${path}`;
            return path;
          } else if (nearestParentAttribute && nearestParentAttributeValue) {
            path = `//*[@${nearestParentAttribute}='${nearestParentAttributeValue}']${path}`;
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
          'li',
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
        ];

        while (target && target !== document) {
          // Check if the target is a clickable element
          // Check for test attributes and accessibility attributes
          const selectors = getBestSelectors(target, event);
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
            target.textContent?.length > 0 && target.textContent?.length < 200
              ? target.textContent.replace(/\s+/g, ' ').trim()
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
          href: target.getAttribute('href'),
          src: target.getAttribute('src'),
          alt: target.alt,
        };
      };

      const getXpathsIncluded = (selectors, currentTarget, event) => {
        selectors.push({
          type: 'locator',
          value: generateXPathWithNearestParentId(currentTarget),
        });
        selectors.push({
          type: 'locator',
          value: getAbsoluteXPath(event.target),
        });
      };

      document.addEventListener('click', (event) => {
        currentEventSnapshot = document.documentElement.innerHTML;
        const currentTarget = getParentElementWithEventOrId(event, 'onclick');
        const selectors = getBestSelectors(currentTarget, event);
        getXpathsIncluded(selectors, currentTarget, event);
        window.saveEventForTest({
          type: 'click',
          target: selectors[0].value,
          time: new Date().toISOString(),
          value: {
            clientX: event.clientX,
            clientY: event.clientY,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
          },
          selectors,
          element: getElement(currentTarget),
        });
        prevEventSnapshot = currentEventSnapshot;
        // window.takeScreenshot();
      });
      document.addEventListener('dblclick', (event) => {
        currentEventSnapshot = document.documentElement.innerHTML;
        const currentTarget = getParentElementWithEventOrId(
          event,
          'ondblclick'
        );
        const selectors = getBestSelectors(currentTarget, event);
        getXpathsIncluded(selectors, currentTarget, event);
        window.saveEventForTest({
          type: 'dblclick',
          target: selectors[0].value,
          time: new Date().toISOString(),
          value: {
            clientX: event.clientX,
            clientY: event.clientY,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
          },
          selectors,
          element: getElement(currentTarget),
        });
      });
      document.addEventListener('contextmenu', (event) => {
        currentEventSnapshot = document.documentElement.innerHTML;
        const currentTarget = getParentElementWithEventOrId(
          event,
          'oncontextmenu'
        );
        const selectors = getBestSelectors(currentTarget, event);
        getXpathsIncluded(selectors, currentTarget, event);
        window.saveEventForTest({
          type: 'contextmenu',
          target: selectors[0].value,
          time: new Date().toISOString(),
          value: {
            clientX: event.clientX,
            clientY: event.clientY,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
          },
          selectors,
          element: getElement(currentTarget),
        });
      });
      document.addEventListener('input', (event) => {
        currentEventSnapshot = document.documentElement.innerHTML;
        const currentTarget = getParentElementWithEventOrId(event, 'oninput');
        const selectors = getBestSelectors(currentTarget, event);
        getXpathsIncluded(selectors, currentTarget, event);
        if (event.target && event.target.tagName === 'INPUT') {
          window.saveEventForTest({
            type: 'input',
            target: selectors[0].value,
            time: new Date().toISOString(),
            value: event.target.value,
            selectors,
            element: getElement(currentTarget),
          });
        }
      });
      document.addEventListener('keypress', (event) => {
        if (
          event.key === 'Enter' ||
          event.key === 'Tab' ||
          event.key === 'Escape' ||
          event.key === 'Backspace' ||
          event.key === 'ArrowUp' ||
          event.key === 'ArrowDown' ||
          event.key === 'ArrowLeft' ||
          event.key === 'ArrowRight'
        ) {
          currentEventSnapshot = document.documentElement.innerHTML;
          const currentTarget = getParentElementWithEventOrId(event, 'oninput');
          const selectors = getBestSelectors(currentTarget, event);
          getXpathsIncluded(selectors, currentTarget, event);
          window.saveEventForTest({
            type: 'keypress',
            key: event.key,
            code: event.code,
            target: selectors[0].value,
            time: new Date().toISOString(),
            value: {
              clientX: event.clientX,
              clientY: event.clientY,
              windowWidth: window.innerWidth,
              windowHeight: window.innerHeight,
            },
            selectors,
            element: getElement(currentTarget),
          });
        }
      });
      // document.addEventListener('change', (event) => {
      //   const currentTarget = getParentElementWithEventOrId(event, 'onchange');
      //   window.saveEventForTest({
      //     type: 'change',
      //     target: generateXPathWithNearestParentId(currentTarget),
      //     time: new Date().toISOString(),
      //     value: event.target.value,
      //     selectors: getBestSelectors(currentTarget),
      //     element: getElement(currentTarget),
      //   });
      // });
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
      window.addEventListener('popstate', () => {
        window.saveEventForTest({
          type: 'popstate-url',
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
          type: 'pushstate-url',
          target: window.location.pathname,
          time: new Date().toISOString(),
          value: window.location.href,
        });
      };

      const originalReplaceState = window.history.replaceState;
      window.history.replaceState = function () {
        originalReplaceState.apply(this, arguments);
        window.saveEventForTest({
          type: 'replacestate-url',
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

const recordMocks = async (browser, req, res) => {
  try {
    logger.info('Starting mock recording', {
      url: req.body.url,
      testName: req.body.testName,
      patterns: req.body.patterns,
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
    const patterns = req.body.patterns || [];
    process.env.recordTest = testName;
    process.env.recordMocks = testName;
    addUrlToProject({ url, patterns });

    // Spy on fetch API calls
    await page.route('**', async (route) => {
      const currentRequest = route.request();
      let response = null;
      try {
        // Check if URL matches any of the patterns
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
            served: false,
            ignoreParams: process.env.DEFAULT_IGNORE_PARAMS
              ? process.env.DEFAULT_IGNORE_PARAMS.split(',')
              : [],
          };

          if (req.body.avoidDuplicatesInTheTest) {
            logger.debug('Checking for duplicates in test', { testName });
            // Check if the mock data is a duplicate of a mock data in the test
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

          if (req.body.avoidDuplicatesWithDefaultMocks) {
            logger.debug('Checking for duplicates with default mocks');
            // Check if the mock data is a duplicate of a mock data in the test
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

          // Save the mock data to the test
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
          fs.writeFileSync(mocDataPath, JSON.stringify(mockData, null, 2));

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
        return;
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
        testName: testName || 'defaultMocks',
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
