const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const path = require('path');
const { getDefaultMockData, processURL } = require('./MockUtils');


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
    const mocksPath = path.join(process.env.MOCK_DIR, `test_${testId}.json`);
    const mocksData = fs.readFileSync(mocksPath, 'utf8');
    const mocks = JSON.parse(mocksData);

    const mockData = new Map(mocks.map(mock => {
      const fileContent = JSON.parse(fs.readFileSync(mock.path, 'utf8'));
      return [processURL(fileContent.url), fileContent];
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
  const defaultMockData = getDefaultMockData();

  console.log(mockData, defaultMockData);
  if (mockData?.has(processedURL) || defaultMockData?.has(processedURL)) {
    const responseData = mockData?.get(processedURL) || defaultMockData?.get(processedURL);
    const { content, headers, status } = responseData.response;
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
      // console.log(responseData, response.content);
      res.status(status).json(JSON.parse(content));
    }
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

module.exports = app;