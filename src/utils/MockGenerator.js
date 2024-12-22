const fs = require('fs');
const urlmodule = require('url');
const path = require('path');
const uuid = require('uuid');
const {
  processURL,
  getDefaultMockData,
  isSameRequest,
  removeDuplicates,
  compareMockToHarEntry,
  loadMockDataFromMockListFile,
  nameToFolder,
  compareMockToMock,
} = require('./MockUtils');

function isJsonResponse(entry) {
  // Check if the response has a content type header and it is JSON
  const contentTypeHeader = entry.response.headers.find(
    (header) => header.name.toLowerCase() === 'content-type'
  );

  return (
    contentTypeHeader &&
    (contentTypeHeader.value.includes('application/json') ||
      contentTypeHeader.value.includes('image/png'))
  );
}

function extractFileName(filePath) {
  // Use the path module to handle file paths across different operating systems
  const path = require('path');

  // Extract the base name (file name with extension) from the full path
  const baseName = path.basename(filePath);

  return baseName;
}

function processHAR(
  harFilePath,
  outputFolder,
  fileName = 'default.json',
  testName,
  avoidDuplicates
) {
  let defaultMockData = [];
  if (avoidDuplicates === 'true') {
    defaultMockData = getDefaultMockData();
  }
  // Read the HAR file
  const harData = fs.readFileSync(harFilePath, 'utf8');

  // Parse HAR data
  const harObject = JSON.parse(harData);

  // Create a directory for individual response files
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder);
  }

  let existResps = [];

  if (fs.existsSync(path.join(outputFolder, fileName))) {
    existResps = loadMockDataFromMockListFile(outputFolder, fileName, testName);
  }

  // Extract information and create individual JSON files for each response
  const responses = harObject.log.entries
    .map((entry, index) => {
      console.log(
        entry.request.url + ' is json response = ' + isJsonResponse(entry)
      );
      // if (isJsonResponse(entry)) {
      const url = processURL(entry.request.url);
      const { method, postData } = entry.request;

      const responseInfo = {
        url,
        method,
        request: {
          headers: entry.request.headers.reduce((headers, header) => {
            if (header.name.toLowerCase() !== 'cookie') {
              headers[header.name] = header.value;
            }
            return headers;
          }, {}),
          queryString: entry.request.queryString,
          postData: entry.request.postData,
        },
        response: {
          status: entry.response.status === 304 ? 200 : entry.response.status,
          headers: entry.response.headers.reduce((headers, header) => {
            if (header.name.toLowerCase() !== 'set-cookie') {
              headers[header.name] = header.value;
            }
            return headers;
          }, {}),
          content: entry.response.content.text,
        },
      };

      if (defaultMockData.find((mock) => compareMockToHarEntry(mock, entry))) {
        console.log('not uploaidng due to avoidDuplicates ' + avoidDuplicates);
        return null;
      }

      const eresp = existResps.find((resp) =>
        compareMockToHarEntry(resp, entry)
      );
      let duplicate = false;
      if (eresp) {
        existResps = existResps.filter(
          (resp) => !compareMockToHarEntry(resp, entry)
        );
        duplicate = true;
      }

      const mockId = eresp?.id || uuid.v4();

      const responseFileName = `mock_${mockId}.json`;

      if (
        !fs.existsSync(path.join(outputFolder, !testName ? 'defaultMocks' : ''))
      ) {
        fs.mkdirSync(path.join(outputFolder, !testName ? 'defaultMocks' : ''));
      }
      const responseFilePath = path.join(
        outputFolder,
        !testName ? 'defaultMocks' : '',
        responseFileName
      );
      responseInfo.id = mockId;
      responseInfo.ignoreParams = eresp?.fileContent.ignoreParams;

      fs.writeFileSync(responseFilePath, JSON.stringify(responseInfo, null, 2));
      const responseSummaryRecord = {
        fileName: responseFileName,
        method,
        path: responseFilePath,
        postData,
        url,
        id: mockId,
      };
      existResps.push(
        Object.assign({}, responseSummaryRecord, { fileContent: responseInfo })
      );
      if (!duplicate) {
        return responseSummaryRecord;
      }
      // }
      return null;
    })
    .filter(Boolean); // Filter out non-JSON responses

  existResps.forEach((element) => {
    delete element.fileContent;
  });
  responses.forEach((element) => {
    delete element.fileContent;
  });
  const finalResponses = removeDuplicates(existResps.concat(responses));
  // Create an index file with references to individual response files
  const indexFilePath = `${outputFolder}/${fileName}`;
  fs.writeFileSync(indexFilePath, JSON.stringify(finalResponses, null, 2));

  console.log(
    `Individual response files and index file created in ${outputFolder}`
  );
}

function createMockFromUserInputForDefaultMocks(body) {
  const mockId = uuid.v4();
  body.id = mockId;
  const defaultMockData = getDefaultMockData();
  let mock_test_dir = path.join(process.env.MOCK_DIR, 'defaultMocks');
  let mock_list_file = path.join(process.env.MOCK_DIR, 'default.json');
  const existResps = getDefaultMockData();
  let mock_file = path.join(mock_test_dir, `mock_${mockId}.json`);
  if (!fs.existsSync(mock_test_dir)) {
    fs.mkdirSync(mock_test_dir);
  }
  if (defaultMockData.find((mock) => compareMockToMock(mock, body))) {
    console.log('its duplicate entry for default mocks');
    return null;
  } else {
    console.log(
      'its new entry',
      defaultMockData.find((mock) => compareMockToMock(mock, body)),
      body
    );
  }
  const responseSummaryRecord = {
    fileName: `mock_${mockId}.json`,
    method: body.method,
    path: mock_file,
    postData: body.request.postData,
    url: body.url,
    id: mockId,
  };
  existResps.push(
    Object.assign({}, responseSummaryRecord, { fileContent: body })
  );

  existResps.forEach((element) => {
    delete element.fileContent;
  });
  fs.writeFileSync(mock_file, JSON.stringify(body, null, 2));
  // Create an index file with references to individual response files
  fs.writeFileSync(mock_list_file, JSON.stringify(existResps, null, 2));

  console.log(
    `Individual response files and index file created in ${mock_list_file}`
  );
}

async function createMockFromUserInputForTest(body, testName, avoidDuplicates) {
  try {
    if (!testName) {
      createMockFromUserInputForDefaultMocks(body);
    } else {
      const mockId = uuid.v4();
      body.id = mockId;
      let mock_test_dir = path.join(
        process.env.MOCK_DIR,
        `test_${nameToFolder(testName)}`
      );
      if (!fs.existsSync(mock_test_dir)) {
        fs.mkdirSync(mock_test_dir);
      }
      let mock_list_file = path.join(mock_test_dir, '_mock_list.json');
      if (!fs.existsSync(mock_list_file)) {
        await fs.appendFile(mock_list_file, '', () => {
          console.log('_mock_list.json file created successfully');
        });
      }
      const existResps = loadMockDataFromMockListFile(
        mock_test_dir,
        '_mock_list.json',
        testName
      );
      if (avoidDuplicates) {
        if (
          existResps.find((mock) =>
            compareMockToMock(mock.fileContent, body, true)
          )
        ) {
          console.log(`its duplicate entry for the test ${testName}`);
          return null;
        } else {
          console.log('its new entry');
        }
      }
      let mock_file = path.join(mock_test_dir, `mock_${mockId}.json`);

      const responseSummaryRecord = {
        fileName: `mock_${mockId}.json`,
        method: body.method,
        path: mock_file,
        postData: body.request.postData,
        url: body.url,
        id: mockId,
      };
      existResps.push(
        Object.assign({}, responseSummaryRecord, { fileContent: body })
      );

      existResps.forEach((element) => {
        delete element.fileContent;
      });

      fs.writeFileSync(mock_file, JSON.stringify(body, null, 2));
      // Create an index file with references to individual response files
      fs.writeFileSync(mock_list_file, JSON.stringify(existResps, null, 2));

      console.log(
        `Individual response files and index file created in ${mock_list_file}`
      );
    }
  } catch (e) {
    console.error(e);
    console.log(`*******${testName}********`);
    console.log(body);
  }
}

module.exports = {
  processHAR,
  isSameRequest,
  createMockFromUserInputForTest,
};
