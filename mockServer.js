const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const path = require('path');
const { getDefaultMockData, processURL, loadMockData, isSameRequest, compareMockToRequest } = require('./src/utils/MockUtils');


const app = express();

app.use(bodyParser.json());

app.all("*", (req, res) => {
  const mockData = loadMockData();
  const defaultMockData = getDefaultMockData();
  
  let foundMock = mockData?.find(mock => {
    return compareMockToRequest(mock, req);
  });
  if(!foundMock) {
    foundMock = defaultMockData?.find(mock => {
      return compareMockToRequest(mock, req)
    });
  }
  // console.log(mockData, defaultMockData);
  if (foundMock) {
    const responseData = foundMock.fileContent;
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
        res.status(status).json(JSON.parse(content));
      } else {
        res.status(status).end('');
      }
    }
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

module.exports = app;