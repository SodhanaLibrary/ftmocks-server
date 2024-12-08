const fs = require('fs');
const path = require('path');

const areJsonEqual = (jsonObj1, jsonObj2) => {
  // Check if both are objects and not null
  if (
    typeof jsonObj1 === 'object' &&
    jsonObj1 !== null &&
    typeof jsonObj2 === 'object' &&
    jsonObj2 !== null
  ) {
    // Get the keys of both objects
    const keys1 = Object.keys(jsonObj1).filter((key) => jsonObj1[key] !== null);
    const keys2 = Object.keys(jsonObj2).filter((key) => jsonObj1[key] !== null);

    // Check if the number of keys is different
    if (keys1.length !== keys2.length) {
      return false;
    }

    // Recursively check each key-value pair
    for (let key of keys1) {
      if (!keys2.includes(key) || !areJsonEqual(jsonObj1[key], jsonObj2[key])) {
        return false;
      }
    }

    return true;
  } else {
    // For non-object types, use strict equality comparison
    return jsonObj1 === jsonObj2;
  }
};

const nameToFolder = (name) => {
  console.log(name);
  return name.replaceAll(' ', '_');
};

const processURL = (url, ignoreParams = []) => {
  // Remove the hostname from the URL
  const urlWithoutHost = url.replace(/^(https?:\/\/)?[^\/]+/, '');
  const processedURL = new URL(`http://domain.com${urlWithoutHost}`);
  const params = new URLSearchParams(processedURL.search);
  if (ignoreParams?.length > 0) {
    ignoreParams.forEach((ip) => {
      params.delete(ip);
    });
  }
  params.sort();
  return decodeURIComponent(`${processedURL.pathname}?${params}`);
};

const getDefaultMockData = () => {
  const defaultPath = path.join(process.env.MOCK_DIR, 'default.json');

  try {
    const defaultData = fs.readFileSync(defaultPath, 'utf8');
    let parsedData = JSON.parse(defaultData);

    // Read and attach mock data for each entry in parsedData
    parsedData.forEach((entry) => {
      const mockFilePath = path.join(
        process.env.MOCK_DIR,
        'defaultMocks',
        `mock_${entry.id}.json`
      );
      try {
        const mockData = fs.readFileSync(mockFilePath, 'utf8');
        entry.fileContent = JSON.parse(mockData);
      } catch (error) {
        console.error(`Error reading mock data for ${entry.path}:`, error);
        return entry; // Return the original entry if there's an error
      }
    });
    return parsedData;
  } catch (error) {
    console.error(`Error reading or parsing default.json:`, error);
    return [];
  }
};

const getDefaultMockDataSummaryList = () => {
  const defaultPath = path.join(process.env.MOCK_DIR, 'default.json');

  try {
    const defaultData = fs.readFileSync(defaultPath, 'utf8');
    let parsedData = JSON.parse(defaultData);
    return parsedData;
  } catch (error) {
    console.error(`Error reading or parsing default.json:`, error);
    return [];
  }
};

const loadMockData = () => {
  try {
    // Read the test ID from mockServer.config.json
    const configPath = path.join(
      process.env.MOCK_DIR,
      'mockServer.config.json'
    );
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    const testName = config.testName;

    // Read the tests from '_mock_list.json'
    const mocksPath = path.join(
      process.env.MOCK_DIR,
      `test_${nameToFolder(testName)}`,
      '_mock_list.json'
    );
    const mocksData = fs.readFileSync(mocksPath, 'utf8');
    const mocks = JSON.parse(mocksData);

    mocks.forEach((mock) => {
      const fileContent = JSON.parse(
        fs.readFileSync(
          path.join(
            process.env.MOCK_DIR,
            `test_${nameToFolder(testName)}`,
            `mock_${mock.id}.json`
          ),
          'utf8'
        )
      );
      mock.fileContent = fileContent;
    });

    return { mocks, testName };
  } catch (error) {
    console.error('Error loading test data:', error.message);
    return [];
  }
};

const loadMockDataFromMockListFile = (mockFolder, mockListFile, testName) => {
  try {
    const mocksData = fs.readFileSync(
      path.join(mockFolder, mockListFile),
      'utf8'
    );
    const mocks = JSON.parse(mocksData);

    mocks.forEach((mock) => {
      const fileContent = JSON.parse(
        fs.readFileSync(
          path.join(
            mockFolder,
            testName ? '' : 'defaultMocks',
            `mock_${mock.id}.json`
          ),
          'utf8'
        )
      );
      mock.fileContent = fileContent;
    });

    return mocks;
  } catch (error) {
    console.error('Error loading test data:', error.message);
    return [];
  }
};

const isSameRequest = (req1, req2) => {
  let matched = true;
  if (req1.url !== req2.url) {
    matched = false;
    // console.log('not matched at url', req1.method, req2.method);
  } else if (req1.method !== req2.method) {
    matched = false;
    // console.log('not matched at method', req1.method, req2.method);
  } else if (
    (!req1.postData && req2.postData && req1.method.toUpperCase() !== 'GET') ||
    (req1.postData && !req2.postData && req1.method.toUpperCase() !== 'GET')
  ) {
    matched = areJsonEqual(req1.postData || {}, req2.postData || {});
    // console.log('not matched at post Data 0', req1.postData, req2.postData);
  } else if (
    req1.postData &&
    req2.postData &&
    !areJsonEqual(req1.postData, req2.postData)
  ) {
    // console.log('not matched at post Data 1', req1.postData, req2.postData);
    console.log('--------start-----------');
    console.log(req1.postData);
    console.log('-------------------');
    console.log(req2.postData);
    console.log('--------end-----------');
    matched = false;
  }
  if (matched) {
    console.log('matched requests', req1, req2);
  }
  return matched;
};

const compareMockToRequest = (mock, req) => {
  const mockURL = processURL(
    mock.fileContent.url,
    mock.fileContent.ignoreParams
  );
  const reqURL = processURL(req.originalUrl, mock.fileContent.ignoreParams);
  const postData = mock.fileContent.request?.postData?.text
    ? JSON.parse(mock.fileContent.request?.postData?.text)
    : mock.fileContent.request?.postData;
  return isSameRequest(
    { url: mockURL, method: mock.fileContent.method, postData },
    {
      method: req.method,
      postData: req.body,
      url: reqURL,
    }
  );
};

const compareMockToHarEntry = (mock, harEntry) => {
  try {
    const mockURL = processURL(
      mock.fileContent.url,
      mock.fileContent.ignoreParams
    );
    const reqURL = processURL(
      harEntry.request.url,
      mock.fileContent.ignoreParams
    );
    const postData = mock.fileContent.request?.postData;
    return isSameRequest(
      { url: mockURL, method: mock.fileContent.method, postData },
      {
        method: harEntry.request.method,
        postData: harEntry.request.postData,
        url: reqURL,
      }
    );
  } catch (error) {
    console.error(error);
    console.log(mock, harEntry);
    return false;
  }
};

const compareMockToMock = (mock1, mock2) => {
  try {
    return isSameRequest(mock1, mock2);
  } catch (error) {
    console.error(error);
    console.log(mock, harEntry);
    return false;
  }
};

const removeDuplicates = (jsonArray) => {
  const uniqueObjects = new Set();

  // Filter the array and only keep unique objects
  const result = jsonArray.filter((item) => {
    const itemString = JSON.stringify(item);

    // Check if this object is already in the Set
    if (!uniqueObjects.has(itemString)) {
      uniqueObjects.add(itemString);
      return true; // Keep this item
    }

    return false; // Exclude this item (it's a duplicate)
  });

  return result;
};

module.exports = {
  processURL,
  getDefaultMockData,
  getDefaultMockDataSummaryList,
  loadMockDataFromMockListFile,
  loadMockData,
  isSameRequest,
  areJsonEqual,
  removeDuplicates,
  nameToFolder,
  compareMockToRequest,
  compareMockToHarEntry,
  compareMockToMock,
};
