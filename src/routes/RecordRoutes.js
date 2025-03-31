const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { nameToFolder, compareMockToMock, loadMockDataFromMockListFile } = require('../utils/MockUtils');


const sendLog = (message, res) => {
    console.log(message);
    res.write(`data: ${message}\n\n`)
};

  
const recordMocks = async (browser, req, res) => {
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
  
    const url = req.body.url; // Predefined URL
    const testName = req.body.testName;
    const pattern = req.body.pattern;
    process.env.recordTest = testName;
    await page.goto(url);
    // Spy on fetch API calls
    await page.route('**', async (route) => {
        // Convert pattern string to RegExp
        const patternRegex = new RegExp(pattern);
        const urlObj = new URL(route.request().url());
        if (!patternRegex.test(urlObj.pathname)) {
            await route.continue();
            return;
        }
        const mockData = {
            url: urlObj.pathname + urlObj.search,
            time: new Date().toString(),
            method: route.request().method(),
            request: {
                headers: await route.request().headers(),
                queryString: route.request().url().split('?')[1],
                postData: route.request().postData() ? {
                    mimeType: 'application/json',
                    text: route.request().postData()
                } : null
            },
            response: {
                status: (await route.fetch()).status(),
                headers: (await route.fetch()).headers(),
                content: await (await route.fetch()).text()
            },
            id: crypto.randomUUID(),
            served: false
        };

        if(mockData.url.includes('/api/v1/recordedEvents')) {
            await route.continue();
            return;
        }

        if(req.body.avoidDuplicatesInTheTest) {
            // Check if the mock data is a duplicate of a mock data in the test
            const testMockList = loadMockDataFromMockListFile(path.join(process.env.MOCK_DIR, `test_${nameToFolder(testName)}`), `_mock_list.json`, testName);
            const matchResponse = testMockList.find(mock => compareMockToMock(mock.fileContent, mockData, true));
            if (matchResponse) {
                console.log('Aborting duplicate mock data in the test');
                await route.continue();
                return;
            }
        }

        if(req.body.avoidDuplicatesWithDefaultMocks) {
            // Check if the mock data is a duplicate of a mock data in the test
            const defaultMockList = loadMockDataFromMockListFile(process.env.MOCK_DIR, `default.json`);
            const matchResponse = defaultMockList.find(mock => compareMockToMock(mock.fileContent, mockData, true));
            if (matchResponse) {
                console.log('Aborting duplicate mock data with default mocks');
                await route.continue();
                return;
            }
        }

        // Save the mock data to the test
        const mockListPath = path.join(process.env.MOCK_DIR, `test_${nameToFolder(testName)}`, '_mock_list.json');
        let mockList = [];
        if (fs.existsSync(mockListPath)) {
            mockList = JSON.parse(fs.readFileSync(mockListPath, 'utf8'));
        }
        mockList.push({
            id: mockData.id,
            url: mockData.url,
            method: mockData.method,
            time: mockData.time
        });
        
        fs.writeFileSync(mockListPath, JSON.stringify(mockList, null, 2));
        const mocDataPath = path.join(process.env.MOCK_DIR, `test_${nameToFolder(testName)}`, `mock_${mockData.id}.json`);
        fs.writeFileSync(mocDataPath, JSON.stringify(mockData, null, 2));
        await route.continue();
    });
    // Inject script to log various user interactions
    await page.evaluate(() => {
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
        
        const saveEventForTest = (event, testName = '') => {
            event.id = crypto.randomUUID();
            event.target = generateXPathWithNearestParentId(event.target);
            fetch(`http://localhost:5000/api/v1/recordedEvents`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify(event),
            }).then(response => response.json());
        }

        document.addEventListener('click', (event) => {
            saveEventForTest({
                type: 'click',
                target: event.target,
                time: new Date().toISOString(),
                value: {
                    clientX: event.clientX,
                    clientY: event.clientY
                }
            });
        });
        document.addEventListener('dblclick', (event) => {
            saveEventForTest({
                type: 'dblclick',
                target: event.target,
                time: new Date().toISOString(),
                value: {
                    clientX: event.clientX,
                    clientY: event.clientY
                }
            });
        });
        document.addEventListener('contextmenu', (event) => {
            saveEventForTest({
                type: 'contextmenu',
                target: event.target,
                time: new Date().toISOString(),
                value: {
                    clientX: event.clientX,
                    clientY: event.clientY
                }
            });
        });
        document.addEventListener('input', (event) => {
            if (event.target && event.target.tagName === 'INPUT') {
                saveEventForTest({
                    type: 'input',
                    target: event.target,
                    time: new Date().toISOString(),
                    value: event.target.value
                });
            }
        });
        document.addEventListener('change', (event) => {
            saveEventForTest({
                type: 'change',
                target: event.target,
                time: new Date().toISOString(),
                value: event.target.value
            });
        });
        document.addEventListener('submit', (event) => {
            event.preventDefault();
            const formData = new FormData(event.target);
            const entries = {};
            formData.forEach((value, key) => {
                entries[key] = value;
            });
            saveEventForTest({
                type: 'submit',
                target: event.target,
                time: new Date().toISOString(),
                value: entries
            });
        });
    });
  
    // // Spy on URL changes
    // page.on('framenavigated', (frame) => {
    //     saveEventForTest({
    //         type: 'urlchange',
    //         target: frame.url(),
    //         time: new Date().toISOString(),
    //         value: frame.url()
    //     }, testName);
    // });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const recordTest = async (browser, req, res) => {
    try {
        const context = await browser.newContext();
        const page = await context.newPage();
      
        const url = req.body.url; // Predefined URL
        const testName = req.body.testName;
        process.env.recordTest = testName;
        await page.goto(url);
        // Inject script to log various user interactions
        await page.evaluate(() => {
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
            
            const saveEventForTest = (event, testName = '') => {
                event.id = crypto.randomUUID();
                event.target = generateXPathWithNearestParentId(event.target);
                fetch(`http://localhost:5000/api/v1/recordedEvents`, {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(event),
                }).then(response => response.json());
            }
    
            document.addEventListener('click', (event) => {
                saveEventForTest({
                    type: 'click',
                    target: event.target,
                    time: new Date().toISOString(),
                    value: {
                        clientX: event.clientX,
                        clientY: event.clientY
                    }
                });
            });
            document.addEventListener('dblclick', (event) => {
                saveEventForTest({
                    type: 'dblclick',
                    target: event.target,
                    time: new Date().toISOString(),
                    value: {
                        clientX: event.clientX,
                        clientY: event.clientY
                    }
                });
            });
            document.addEventListener('contextmenu', (event) => {
                saveEventForTest({
                    type: 'contextmenu',
                    target: event.target,
                    time: new Date().toISOString(),
                    value: {
                        clientX: event.clientX,
                        clientY: event.clientY
                    }
                });
            });
            document.addEventListener('input', (event) => {
                if (event.target && event.target.tagName === 'INPUT') {
                    saveEventForTest({
                        type: 'input',
                        target: event.target,
                        time: new Date().toISOString(),
                        value: event.target.value
                    });
                }
            });
            document.addEventListener('change', (event) => {
                saveEventForTest({
                    type: 'change',
                    target: event.target,
                    time: new Date().toISOString(),
                    value: event.target.value
                });
            });
            document.addEventListener('submit', (event) => {
                event.preventDefault();
                const formData = new FormData(event.target);
                const entries = {};
                formData.forEach((value, key) => {
                    entries[key] = value;
                });
                saveEventForTest({
                    type: 'submit',
                    target: event.target,
                    time: new Date().toISOString(),
                    value: entries
                });
            });
        });
      
        // // Spy on URL changes
        // page.on('framenavigated', (frame) => {
        //     saveEventForTest({
        //         type: 'urlchange',
        //         target: frame.url(),
        //         time: new Date().toISOString(),
        //         value: frame.url()
        //     }, testName);
        // });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
};

module.exports = {
  recordMocks,
  recordTest
};
