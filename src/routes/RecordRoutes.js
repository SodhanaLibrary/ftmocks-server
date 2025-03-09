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
    await page.goto(url);
    
    // Inject script to log various user interactions
    await page.evaluate(() => {
        document.addEventListener('mousemove', (event) => {
            console.log(`Mouse moved: ${event.clientX}, ${event.clientY}`);
        });
        document.addEventListener('click', (event) => {
            console.log(`Mouse clicked at: ${event.clientX}, ${event.clientY}`);
        });
        document.addEventListener('dblclick', (event) => {
            console.log(`Double-clicked at: ${event.clientX}, ${event.clientY}`);
        });
        document.addEventListener('contextmenu', (event) => {
            console.log(`Right-click (context menu) at: ${event.clientX}, ${event.clientY}`);
        });
        document.addEventListener('input', (event) => {
            if (event.target && event.target.tagName === 'INPUT') {
                console.log(`Input changed in ${event.target.name || event.target.id || 'unknown'}: ${event.target.value}`);
            }
        });
        document.addEventListener('change', (event) => {
            console.log(`Change event in ${event.target.name || event.target.id || 'unknown'}: ${event.target.value}`);
        });
        document.addEventListener('submit', (event) => {
            event.preventDefault();
            const formData = new FormData(event.target);
            const entries = {};
            formData.forEach((value, key) => {
                entries[key] = value;
            });
            console.log(`Form submitted:`, entries);
        });
    });
  
    // Spy on URL changes
    page.on('framenavigated', (frame) => {
        sendLog(`URL changed to: ${frame.url()}`, res);
    });
  
    // Spy on fetch API calls
    await page.route('**', async (route) => {
        const mockData = {
            url: new URL(route.request().url()).pathname,
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
                headers: Object.entries((await route.fetch()).headers()),
                content: await (await route.fetch()).text()
            },
            id: crypto.randomUUID(),
            served: false
        };

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
  
    sendLog('Perform mouse, input, form, and navigation events. Close the browser to end the program.', res);
    // res.send('Browser session started. Check console for logs.');
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const recordTest = async (req, res) => {
    try {
        const context = await browser.newContext();
        const page = await context.newPage();
      
        const url = req.body.url; // Predefined URL
        await page.goto(url);
        
        // Inject script to log various user interactions
        await page.evaluate(() => {
            document.addEventListener('mousemove', (event) => {
                console.log(`Mouse moved: ${event.clientX}, ${event.clientY}`);
            });
            document.addEventListener('click', (event) => {
                console.log(`Mouse clicked at: ${event.clientX}, ${event.clientY}`);
            });
            document.addEventListener('dblclick', (event) => {
                console.log(`Double-clicked at: ${event.clientX}, ${event.clientY}`);
            });
            document.addEventListener('contextmenu', (event) => {
                console.log(`Right-click (context menu) at: ${event.clientX}, ${event.clientY}`);
            });
            document.addEventListener('input', (event) => {
                if (event.target && event.target.tagName === 'INPUT') {
                    console.log(`Input changed in ${event.target.name || event.target.id || 'unknown'}: ${event.target.value}`);
                }
            });
            document.addEventListener('change', (event) => {
                console.log(`Change event in ${event.target.name || event.target.id || 'unknown'}: ${event.target.value}`);
            });
            document.addEventListener('submit', (event) => {
                event.preventDefault();
                const formData = new FormData(event.target);
                const entries = {};
                formData.forEach((value, key) => {
                    entries[key] = value;
                });
                console.log(`Form submitted:`, entries);
            });
        });
      
        // Spy on URL changes
        page.on('framenavigated', (frame) => {
            sendLog(`URL changed to: ${frame.url()}`, res);
        });
      
        // Spy on fetch API calls
        await page.route('**', async (route) => {
            const request = route.request();
            sendLog(`Fetching: ${request.url()}`, res);
            sendLog(`Request Method: ${request.method()}`, res);
            sendLog(`Request Headers: ${JSON.stringify(await request.headers())}`, res);
            if (request.postData()) {
                sendLog(`Request Body: ${request.postData()}`, res);
            }
            
            const response = await route.fetch();
            const responseBody = await response.text();
            sendLog(`Response Status: ${response.status()}`, res);
            sendLog(`Response Headers: ${JSON.stringify(response.headers())}`, res);
            sendLog(`Response Body: ${responseBody.substring(0, 500)}...`, res); // Limit response logging size
            
            await route.continue();
        });
      
        sendLog('Perform mouse, input, form, and navigation events. Close the browser to end the program.', res);
        res.send('Browser session started. Check console for logs.');
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
};

module.exports = {
  recordMocks,
  recordTest
};
