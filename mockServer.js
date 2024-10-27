const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const path = require('path');
const { getDefaultMockData, processURL, loadMockData } = require('./src/utils/MockUtils');


const app = express();

app.use(bodyParser.json());

app.all("*", (req, res) => {
  const { originalUrl, method, body } = req;
  console.log(originalUrl, method, body);
  const processedURL = processURL(originalUrl);
  const mockData = loadMockData();
  const defaultMockData = getDefaultMockData();
  const method__url = `${method}'___'${processedURL}`;

  // console.log(mockData, defaultMockData);
  if (mockData?.has(method__url) || defaultMockData?.has(method__url)) {
    const responseData = mockData?.get(method__url) || defaultMockData?.get(method__url);
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