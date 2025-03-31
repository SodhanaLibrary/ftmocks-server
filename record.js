const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    const url = 'http://localhost:5777/'; // Predefined URL
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
        console.log(`URL changed to: ${frame.url()}`);
    });

    // Spy on fetch API calls
    await page.route('**', async (route) => {
        const request = route.request();
        console.log(`Fetching: ${request.url()}`);
        console.log(`Request Method: ${request.method()}`);
        console.log(`Request Headers:`, await request.headers());
        if (request.postData()) {
            console.log(`Request Body: ${request.postData()}`);
        }
        
        const response = await route.fetch();
        const responseBody = await response.text();
        console.log(`Response Status: ${response.status()}`);
        console.log(`Response Headers:`, response.headers());
        console.log(`Response Body: ${responseBody.substring(0, 500)}...`); // Limit response logging size
        
        await route.continue();
    });

    console.log('Perform mouse, input, form, and navigation events. Close the browser to end the program.');
    
    // Listen for browser close event
    browser.on('disconnected', () => {
        console.log('Browser closed by user, program ended.');
    });

    // Wait for the browser to close
    await new Promise(resolve => browser.on('disconnected', resolve));
    console.log('Browser closed, program ended.');
})();
