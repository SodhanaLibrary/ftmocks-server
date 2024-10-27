const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const path = require('path');
const mockServer = require('./mockServer');
const multer = require('multer');
const { getTests, deleteTest, updateTest, createTest, getMockDataForTest, createMockDataForTest, deleteMockDataForTest, createHarMockDataForTest, updateMockDataForTest } = require('./src/routes/TestRoutes');
const { getDefaultMocks, deleteDefaultMock, updateDefaultMock, uploadDefaultHarMocs } = require('./src/routes/DefaultMockRoutes');


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

// Router for /api/v1/tests GET method
app.get('/api/v1/tests', getTests);

// Router for /api/v1/tests DELETE method
app.delete('/api/v1/tests/:id', deleteTest);

// Router for /api/v1/tests PUT method
app.put('/api/v1/tests/:id', updateTest);

// Router for /api/v1/tests POST method
app.post('/api/v1/tests', createTest);

// Router for /api/v1/defaultmocks GET method
app.get('/api/v1/defaultmocks', getDefaultMocks);

// Router for /api/v1/defaultmocks/:id DELETE method
app.delete('/api/v1/defaultmocks/:id', deleteDefaultMock);

// Router for /api/v1/defaultmocks/:id PUT method
app.put('/api/v1/defaultmocks/:id', updateDefaultMock);

// Router for /api/v1/tests/:id/mockdata GET method
app.get('/api/v1/tests/:id/mockdata', getMockDataForTest);

// Router for /api/v1/tests/:id/mockdata POST method
app.post('/api/v1/tests/:id/mockdata', createMockDataForTest);

// Router for /api/v1/tests/:id/harMockdata POST method
app.post('/api/v1/tests/:id/harMockdata', upload.single('harFile'), createHarMockDataForTest);

// Router for /api/v1/tests/:id/mockdata/:mockId DELETE method
app.delete('/api/v1/tests/:id/mockdata/:mockId', deleteMockDataForTest);

// Router for /api/v1/tests/:id/mockdata/:mockId PUT method
app.put('/api/v1/tests/:id/mockdata/:mockId', updateMockDataForTest);


// Router for /api/v1/mockServer GET method
app.get('/api/v1/mockServer', async (req, res) => {
  const configPath = path.join(process.env.MOCK_DIR, 'mockServer.config.json');

  try {
    if(!fs.existsSync(configPath)) {
      await fs.appendFile(configPath, '{}', () => {
        console.log('mockServer.config.json created successfully');
      });
    }
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

  const testsPath = path.join(process.env.MOCK_DIR, 'tests.json');

  try {
    // Read and parse the tests.json file
    const testsData = JSON.parse(fs.readFileSync(testsPath, 'utf8'));
    
    // Find the test with the given id
    const test = testsData.find(test => test.id === testId);
    // Save the test ID to mockServer.config.json
    const configPath = path.join(process.env.MOCK_DIR, 'mockServer.config.json');
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

app.post('/api/v1/defaultHarMocks', upload.single('harFile'), uploadDefaultHarMocs);


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

