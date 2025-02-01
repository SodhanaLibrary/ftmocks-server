const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const path = require('path');
const { getDefaultMockData, processURL, loadMockData, nameToFolder, compareMockToRequest } = require('./src/utils/MockUtils');


const app = express();

app.use(bodyParser.json());

app.all("*", (req, res) => {
  try {
    const mockDataObj = loadMockData();
    const mockData = mockDataObj.mocks;
    const testName = mockDataObj.testName;
    const defaultMockData = getDefaultMockData();
    
    let served = false;
    let matchedMocks = mockData?.filter(mock => {
      if (mock.fileContent.waitForPrevious && !served) {
        return false;
      }
      served = mock.fileContent.served;
      return compareMockToRequest(mock, req);
    }) || [];
    let foundMock = matchedMocks.find(mock => !mock.fileContent.served) ? matchedMocks.find(mock => !mock.fileContent.served) : matchedMocks[matchedMocks.length - 1];
    
    if(!foundMock) {
      foundMock = defaultMockData?.find(mock => {
        return compareMockToRequest(mock, req)
      });
    } else {
      foundMock.fileContent.served = true;
      const tetFilePath = path.join(process.env.MOCK_DIR, `test_${nameToFolder(testName)}`, `mock_${foundMock.id}.json`);
      fs.writeFileSync(tetFilePath, JSON.stringify(foundMock.fileContent, null, 2));
    }
    // console.log(mockData, defaultMockData);
    if (foundMock) {
      const responseData = foundMock.fileContent;
      setTimeout(() => {
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
          if(content) {
            try {
              res.status(status).json(JSON.parse(content));
            } catch(e) {
              res.status(status).end(content);
            }
          } else {
            res.status(status).end('');
          }
        }
      }, responseData.delay ? parseInt(responseData.delay) : 0)
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  } catch(e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = app;