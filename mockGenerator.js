const fs = require('fs');
const urlmodule = require('url');
const path = require('path');
const uuid = require('uuid');
const { processURL } = require('./MockUtils');

function isJsonResponse(entry) {
  // Check if the response has a content type header and it is JSON
  const contentTypeHeader = entry.response.headers.find(
    header => header.name.toLowerCase() === 'content-type'
  );

  return (
    contentTypeHeader &&
    (
      contentTypeHeader.value.includes('application/json') || contentTypeHeader.value.includes('image/png')
    )
  );
}

function extractFileName(filePath) {
  // Use the path module to handle file paths across different operating systems
  const path = require('path');
  
  // Extract the base name (file name with extension) from the full path
  const baseName = path.basename(filePath);
  
  return baseName;
}


function processHAR(harFilePath, outputFolder, fileName = 'default.json', testId) {
  // Read the HAR file
  const harData = fs.readFileSync(harFilePath, 'utf8');

  // Parse HAR data
  const harObject = JSON.parse(harData);

  // Create a directory for individual response files
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder);
  }

  let existResps = [];

  if (fs.existsSync(`${outputFolder}/${fileName}`)) {
    const data = fs.readFileSync(`${outputFolder}/${fileName}`, "utf8");
    existResps = JSON.parse(data);
  }

  // Extract information and create individual JSON files for each response
  const respHash = {};
  const responses = harObject.log.entries
    .map((entry, index) => {
      if (isJsonResponse(entry)) {
        const url = processURL(entry.request.url);
        const { method, postData } = entry.request;

        // if(respHash[method+ '___'+url]) {
        //   return null;
        // }

        const responseInfo = {
          url,
          method,
          headers: entry.request.headers.reduce((headers, header) => {
            if(header.name !== 'cookie') {
              headers[header.name] = header.value;
            }
            return headers;
          }, {}),
          response: {
            status: entry.response.status,
            headers: entry.response.headers.reduce(
              (headers, header) => {
              if(header.name !== 'set-cookie') {
                headers[header.name] = header.value;
              }
              return headers;
            },
              {}
            ),
            content: entry.response.content.text,
          },
        };

        const eresp = existResps.find(resp => resp.url === responseInfo.url && resp.method === responseInfo.method);
        if(eresp) {
          existResps = existResps.filter(resp => !(resp.url === responseInfo.url && resp.method === responseInfo.method));
        }

        const mockId = eresp?.id || uuid.v4();

        const responseFileName = eresp ? extractFileName(eresp.fileName) : `mock_${mockId}.json`;
        
        if (!fs.existsSync(path.join(outputFolder, testId || 'defaultMocks'))) {
          fs.mkdirSync(path.join(outputFolder, testId || 'defaultMocks'));
        }
        const responseFilePath = path.join(outputFolder, testId || 'defaultMocks', responseFileName);
        responseInfo.id = mockId;

        fs.writeFileSync(
          responseFilePath,
          JSON.stringify(responseInfo, null, 2)
        );
        respHash[method+ '___'+url] = true;
        return {
          fileName: responseFileName,
          method,
          path: responseFilePath,
          postData,
          url,
          id: mockId,
        };
      }
      return null;
    })
    .filter(Boolean); // Filter out non-JSON responses

  // Create an index file with references to individual response files
  const indexFilePath = `${outputFolder}/${fileName}`;
  fs.writeFileSync(indexFilePath, JSON.stringify(existResps.concat(responses), null, 2));

  console.log(
    `Individual response files and index file created in ${outputFolder}`
  );
}

module.exports = {
  processHAR,
};