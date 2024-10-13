const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const path = require('path');
const { getDefaultMockData, processURL } = require('./MockUtils');

const defaultMockData = getDefaultMockData();

const app = express();

app.use(bodyParser.json());

function loadMockData() {
  try {
    // Read the test ID from mockServer.config.json
    const configPath = path.join(__dirname, 'mockServer.config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    const testId = config.testId;

    // Read the tests from tests.json
    const testsPath = path.join(__dirname, 'sample', 'my-project', 'tests.json');
    const testsData = fs.readFileSync(testsPath, 'utf8');
    const tests = JSON.parse(testsData);

    // Find the test with the matching ID
    const test = tests.find(t => t.id === testId);

    if (!test) {
      throw new Error(`Test with ID ${testId} not found`);
    }

    mockData = new Map(test.mockFile.map(fileName => {
      const filePath = path.join(__dirname, 'sample', 'my-project', fileName);
      const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return [processURL(fileContent.request.url), { fileName }];
    }));

    return mockData;
  } catch (error) {
    console.error('Error loading test data:', error.message);
    return null;
  }
}

app.all("*", (req, res) => {
  const { originalUrl } = req;
  console.log(originalUrl);
  const processedURL = processURL(originalUrl);
  const mockData = loadMockData();

  if (mockData?.has(processedURL) || defaultMockData?.has(processedURL)) {
    const responseData = mockData?.get(processedURL) || defaultMockData?.get(processedURL);
    const completeResponse = responseData.mockData;
    const { content, headers, status } = completeResponse.response;
    const includedHeaders = ["content-type"];

    const headerKeys = Object.keys(headers);
    headerKeys.forEach((aKey) => {
      if (includedHeaders.includes(aKey)) {
        res.set(aKey, headers[aKey]);
      }
    });

    if(headers['content-type'] === 'image/png') {
      var img = Buffer.from(content, 'base64');
      res.status(status).end(img);
    } else {
      res.status(status).json(JSON.parse(content));
    }
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

module.exports = app;