const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const path = require('path');
const mockServer = require('./mockServer');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { processHAR } = require('./mockGenerator');


const upload = multer({ dest: 'uploads/' });

const app = express();
let mockServerInstance;

// Read command line arguments
const args = process.argv.slice(2);
const envfile = args[0] || 'my-project';
require("dotenv").config({path: `${envfile}.env`});
const port = process.env.PORT;
const mockFolder = process.env.MOCK_DIR;

// Middleware to parse JSON in the request body
app.use(bodyParser.json());

function processURL(url) {
  const processedURL = new URL(`http://domain.com${url}`);
  const params = new URLSearchParams(processedURL.search);

  params.delete("endTime");
  params.delete("startMin");
  params.delete("startTime");
  params.delete("startDate");
  params.delete("endDate");
  params.sort();
  return decodeURIComponent(`${processedURL.pathname}?${params}`);
}


// Router for /api/v1/tests GET method
app.get('/api/v1/tests', (req, res) => {
  console.log(req.url);
  // TODO: Implement the logic for handling GET requests to /api/v1/tests
  // This is a placeholder response
  const indexPath = path.join(__dirname, 'sample', 'my-project', 'tests.json');
  try {
    const indexData = fs.readFileSync(indexPath, 'utf8');
    const parsedData = JSON.parse(indexData);
    
    // Map the data to a more suitable format for the response
    const formattedData = parsedData.map(item => ({
      id: item.id,
      name: item.name,
      mockFile: item.mockFile
    }));

    res.status(200).json(formattedData);
  } catch (error) {
    console.error('Error reading or parsing index.json:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Router for /api/v1/tests POST method
app.post('/api/v1/tests', (req, res) => {
  console.log(req.body, req.url);
  const fs = require('fs');
  const path = require('path');

  // Read existing tests
  const testsPath = path.join(__dirname, 'sample', 'my-project', 'tests.json');
  let tests = [];
  try {
    const testsData = fs.readFileSync(testsPath, 'utf8');
    tests = JSON.parse(testsData);
    const newTest = {
      id: uuidv4(),
      name: req.body.name,
      mockFile: []
    };
    tests.push(newTest);
    fs.writeFileSync(testsPath, JSON.stringify(tests, null, 2));
    
    res.status(201).json({
      message: "New test created successfully",
      test: newTest
    });
    return;
  } catch (error) {
    console.error('Error reading tests.json:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Router for /api/v1/defaultmocks GET method
app.get('/api/v1/defaultmocks', (req, res) => {
  console.log(req.url);
  const defaultPath = path.join(__dirname, 'sample', 'my-project', 'default.json');

  try {
    const defaultData = fs.readFileSync(defaultPath, 'utf8');
    let parsedData = JSON.parse(defaultData);
    
    // Read and attach mock data for each entry in parsedData
    parsedData = parsedData.map(entry => {
      const mockFilePath = path.join(__dirname, 'sample', 'my-project', entry.path);
      try {
        const mockData = fs.readFileSync(mockFilePath, 'utf8');
        return {
          ...entry,
          mockData: JSON.parse(mockData)
        };
      } catch (error) {
        console.error(`Error reading mock data for ${entry.path}:`, error);
        return entry; // Return the original entry if there's an error
      }
    });
    res.status(200).json(parsedData);
  } catch (error) {
    console.error('Error reading or parsing default.json:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Router for /api/v1/tests/:id/mockdata GET method
app.get('/api/v1/tests/:id/mockdata', (req, res) => {
  console.log(req.url);
  const testId = req.params.id;
  const indexPath = path.join(__dirname, 'sample', 'my-project', 'tests.json');

  try {
    const indexData = fs.readFileSync(indexPath, 'utf8');
    const parsedData = JSON.parse(indexData);
    
    const test = parsedData.find(item => item.id === testId);
    
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Read and parse all mock files for the test
    const mockDataArray = test.mockFile.map(fileName => {
      const mockFilePath = path.join(__dirname, 'sample', 'my-project', fileName);
      if (!fs.existsSync(mockFilePath)) {
        console.warn(`Mock file not found: ${fileName}`);
        return null;
      }
      const mockData = fs.readFileSync(mockFilePath, 'utf8');
      return JSON.parse(mockData);
    }).filter(data => data !== null);

    if (mockDataArray.length === 0) {
      return res.status(404).json({ error: 'No valid mock files found' });
    }

    res.status(200).json(mockDataArray);
    return;
  } catch (error) {
    console.error('Error reading or parsing mock data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Router for /api/v1/tests/:id/mockdata POST method
app.post('/api/v1/tests/:id/mockdata', (req, res) => {
  const testId = req.params.id;
  const mockData = req.body;
  const testsPath = path.join(__dirname, 'sample', 'my-project', 'tests.json');

  try {
    // Read and parse the tests.json file
    const testsData = JSON.parse(fs.readFileSync(testsPath, 'utf8'));
    
    // Find the test with the given id
    const testIndex = testsData.findIndex(test => test.id === testId);
    
    if (testIndex === -1) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Generate a unique filename for the new mock data
    const fileName = `response_${Date.now()}.json`;
    const filePath = path.join(__dirname, 'sample', 'my-project', fileName);

    // Write the mock data to the new file
    fs.writeFileSync(filePath, JSON.stringify(mockData, null, 2));

    // Add the new filename to the test's mockFile array
    if (!testsData[testIndex].mockFile) {
      testsData[testIndex].mockFile = [];
    }
    testsData[testIndex].mockFile.push(fileName);

    // Save the updated tests data back to tests.json
    fs.writeFileSync(testsPath, JSON.stringify(testsData, null, 2));

    res.status(201).json({
      message: "Mock data added successfully",
      fileName: fileName
    });
  } catch (error) {
    console.error('Error adding mock data:', error);
    res.status(500).json({ error: 'Failed to add mock data' });
  }
});

// Router for /api/v1/mockServer GET method
app.get('/api/v1/mockServer', (req, res) => {
  const configPath = path.join(__dirname, 'mockServer.config.json');

  try {
    // Read the config file
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);

    // Check if testId exists in the config
    if (!config.testId) {
      return res.status(404).json({ error: 'No active mock server found' });
    }

    // Get the port number of the running mock server
    const port = mockServerInstance ? mockServerInstance.address().port : null;

    res.json({
      testId: config.testId,
      port: port
    });
  } catch (error) {
    console.error('Error reading mock server configuration:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Router for /api/v1/mockServer POST method
app.post('/api/v1/mockServer', (req, res) => {
  const { testId, port } = req.body;

  if (!testId || !port) {
    return res.status(400).json({ error: 'Test ID and port are required' });
  }

  const testsPath = path.join(__dirname, 'sample', 'my-project', 'tests.json');

  try {
    // Read and parse the tests.json file
    const testsData = JSON.parse(fs.readFileSync(testsPath, 'utf8'));
    
    // Find the test with the given id
    const test = testsData.find(test => test.id === testId);
    // Save the test ID to mockServer.config.json
    const configPath = path.join(__dirname, 'mockServer.config.json');
    let config = {};
    
    try {
      // Read existing config if it exists
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
      
      // Update the config with the new test ID
      config.testId = testId;
      
      // Write the updated config back to the file
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      
      console.log(`Test ID ${testId} saved to mockServer.config.json`);
    } catch (configError) {
      console.error('Error updating mockServer.config.json:', configError);
      // Continue execution even if config update fails
    }
    
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }
    
    // Start the server
    mockServerInstance = mockServer.listen(port, () => {
      console.log(`Mock server listening at http://localhost:${port}`);
    });

    // Here you would typically start a new mock server instance
    // This is a placeholder for that logic
    console.log(`Starting mock server for test ${testId} on port ${port}`);

    // In a real implementation, you'd start the server here
    // and return information about the started server

    res.status(200).json({
      message: "Mock server started successfully",
      testId: testId,
      port: port
    });
  } catch (error) {
    console.error('Error starting mock server:', error);
    res.status(500).json({ error: 'Failed to start mock server' });
  }
});

// Router for /api/v1/mockServer DELETE method
app.delete('/api/v1/mockServer', (req, res) => {
  const { port } = req.body;

  if (!port) {
    return res.status(400).json({ error: 'Port is required' });
  }

  try {
    // Here you would typically stop the mock server instance
    // This is a placeholder for that logic
    console.log(`Stopping mock server on port ${port}`);

    // In a real implementation, you'd stop the server here
    // and perform any necessary cleanup
    if(mockServerInstance) {
      mockServerInstance.close();
      mockServerInstance = null;
    }

    res.status(200).json({
      message: "Mock server stopped successfully",
      port: port
    });
  } catch (error) {
    console.error('Error stopping mock server:', error);
    res.status(500).json({ error: 'Failed to stop mock server' });
  }
});

app.post('/api/v1/defaultHarMocks', upload.single('harFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No HAR file uploaded' });
  }

  try {
    const harFilePath = req.file.path;
    const outputFolder = path.join(mockFolder);

    await processHAR(harFilePath, outputFolder, 'default.json');

    // Clean up the uploaded file
    fs.unlinkSync(harFilePath);

    res.status(200).json({ message: 'HAR file processed successfully' });
  } catch (error) {
    console.error('Error processing HAR file:', error);
    res.status(500).json({ error: 'Failed to process HAR file' });
  }
});




// Function to handle all unmatched URLs
function handleUnmatchedUrls(req, res) {
  console.log(`Unmatched URL: ${req.originalUrl}`);
  
  // Check if the URL matches a file in the public folder
  const publicFilePath = path.join(__dirname, 'public', req.url);
  if (fs.existsSync(publicFilePath) && fs.statSync(publicFilePath).isFile()) {
    return res.sendFile(publicFilePath);
  } else {
    // If no file matches, serve index.html
    const indexPath = path.join(__dirname, 'public', 'index.html');
    return res.sendFile(indexPath);
  }
}

// Use the handleUnmatchedUrls function as the last middleware
app.use(handleUnmatchedUrls);

// Start the server
app.listen(port, () => {
  console.log(`Mock server listening at http://localhost:${port}`);
});

