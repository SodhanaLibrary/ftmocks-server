const fs = require('fs');
const path = require('path');
const logger = require('./Logger');

const areJsonEqual = (jsonObj1, jsonObj2) => {
  try {
    // Check if both are objects and not null
    if (
      typeof jsonObj1 === 'object' &&
      jsonObj1 !== null &&
      typeof jsonObj2 === 'object' &&
      jsonObj2 !== null
    ) {
      // Get the keys of both objects
      const keys1 = Object.keys(jsonObj1).filter(
        (key) => jsonObj1[key] !== null
      );
      const keys2 = Object.keys(jsonObj2).filter(
        (key) => jsonObj1[key] !== null
      );

      // Check if the number of keys is different
      if (keys1.length !== keys2.length) {
        logger.debug('JSON objects have different key counts', {
          keys1Count: keys1.length,
          keys2Count: keys2.length,
        });
        return false;
      }

      // Recursively check each key-value pair
      for (let key of keys1) {
        if (
          !keys2.includes(key) ||
          !areJsonEqual(jsonObj1[key], jsonObj2[key])
        ) {
          logger.debug('JSON objects differ at key', { key });
          return false;
        }
      }

      return true;
    } else {
      // For non-object types, use strict equality comparison
      const result = jsonObj1 === jsonObj2;
      if (!result) {
        logger.debug('Non-object values are not equal', {
          value1: jsonObj1,
          value2: jsonObj2,
        });
      }
      return result;
    }
  } catch (error) {
    logger.error('Error in areJsonEqual', {
      error: error.message,
      jsonObj1: typeof jsonObj1,
      jsonObj2: typeof jsonObj2,
    });
    return false;
  }
};

const nameToFolder = (name) => {
  const replaceAll = (str, find, replace) => {
    return str.split(find).join(replace);
  };
  const result = replaceAll(name, ' ', '_');
  logger.debug('Converted name to folder', {
    originalName: name,
    folderName: result,
  });
  return result;
};

const processURL = (url, ignoreParams = []) => {
  try {
    logger.debug('Processing URL', { url, ignoreParams });

    // Remove the hostname from the URL
    const urlWithoutHost = url.replace(/^(https?:\/\/)?[^\/]+/, '');
    const processedURL = new URL(`http://domain.com${urlWithoutHost}`);
    const params = new URLSearchParams(processedURL.search);

    if (ignoreParams?.length > 0) {
      ignoreParams.forEach((ip) => {
        params.delete(ip);
      });
      logger.debug('Removed ignored parameters', { ignoreParams });
    }

    params.sort();
    const result = decodeURIComponent(`${processedURL.pathname}?${params}`);

    logger.debug('URL processing completed', {
      originalUrl: url,
      processedUrl: result,
      ignoredParams: ignoreParams,
    });

    return result;
  } catch (error) {
    logger.error('Error processing URL', {
      url,
      ignoreParams,
      error: error.message,
    });
    return url; // Return original URL on error
  }
};

const getDefaultMockData = () => {
  const defaultPath = path.join(process.env.MOCK_DIR, 'default.json');

  try {
    logger.debug('Loading default mock data', { defaultPath });

    const defaultData = fs.readFileSync(defaultPath, 'utf8');
    let parsedData = JSON.parse(defaultData);

    logger.debug('Parsed default mock list', { mockCount: parsedData.length });

    // Read and attach mock data for each entry in parsedData
    let successfulLoads = 0;
    let failedLoads = 0;

    parsedData.forEach((entry) => {
      const mockFilePath = path.join(
        process.env.MOCK_DIR,
        'defaultMocks',
        `mock_${entry.id}.json`
      );
      try {
        const mockData = fs.readFileSync(mockFilePath, 'utf8');
        entry.fileContent = JSON.parse(mockData);
        successfulLoads++;
        logger.debug('Successfully loaded mock file', {
          mockId: entry.id,
          mockFilePath,
        });
      } catch (error) {
        failedLoads++;
        logger.error('Error reading mock data', {
          mockId: entry.id,
          mockFilePath,
          error: error.message,
        });
        return entry; // Return the original entry if there's an error
      }
    });

    logger.info('Default mock data loaded successfully', {
      totalMocks: parsedData.length,
      successfulLoads,
      failedLoads,
    });

    return parsedData;
  } catch (error) {
    logger.error('Error reading or parsing default.json', {
      defaultPath,
      error: error.message,
      stack: error.stack,
    });
    return [];
  }
};

const getDefaultMockDataSummaryList = () => {
  const defaultPath = path.join(process.env.MOCK_DIR, 'default.json');

  try {
    logger.debug('Loading default mock data summary', { defaultPath });

    const defaultData = fs.readFileSync(defaultPath, 'utf8');
    let parsedData = JSON.parse(defaultData);

    logger.info('Default mock data summary loaded', {
      mockCount: parsedData.length,
    });

    return parsedData;
  } catch (error) {
    logger.error('Error reading or parsing default.json summary', {
      defaultPath,
      error: error.message,
      stack: error.stack,
    });
    return [];
  }
};

const loadMockDataByTestName = (testName) => {
  try {
    logger.info('Loading mock data by test name', { testName });

    // Read the tests from '_mock_list.json'
    const mocksPath = path.join(
      process.env.MOCK_DIR,
      `test_${nameToFolder(testName)}`,
      '_mock_list.json'
    );

    logger.debug('Reading mock list file', { mocksPath });

    const mocksData = fs.readFileSync(mocksPath, 'utf8');
    const mocks = JSON.parse(mocksData);

    logger.debug('Parsed mock list', { testName, mockCount: mocks.length });

    let successfulLoads = 0;
    let failedLoads = 0;

    mocks.forEach((mock) => {
      const mockFilePath = path.join(
        process.env.MOCK_DIR,
        `test_${nameToFolder(testName)}`,
        `mock_${mock.id}.json`
      );

      try {
        const fileContent = JSON.parse(fs.readFileSync(mockFilePath, 'utf8'));
        mock.fileContent = fileContent;
        successfulLoads++;
        logger.debug('Successfully loaded test mock file', {
          testName,
          mockId: mock.id,
          mockFilePath,
        });
      } catch (error) {
        failedLoads++;
        logger.error('Error reading test mock file', {
          testName,
          mockId: mock.id,
          mockFilePath,
          error: error.message,
        });
      }
    });

    logger.info('Test mock data loaded successfully', {
      testName,
      totalMocks: mocks.length,
      successfulLoads,
      failedLoads,
    });

    return { mocks, testName };
  } catch (error) {
    logger.error('Error loading test data by name', {
      testName,
      error: error.message,
      stack: error.stack,
    });
    return [];
  }
};

const loadMockData = () => {
  try {
    logger.info('Loading mock data from config');

    // Read the test ID from mockServer.config.json
    const configPath = path.join(
      process.env.MOCK_DIR,
      'mockServer.config.json'
    );

    logger.debug('Reading mock server config', { configPath });

    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    const testName = config.testName;

    logger.debug('Retrieved test name from config', { testName });

    // Read the tests from '_mock_list.json'
    const mocksPath = path.join(
      process.env.MOCK_DIR,
      `test_${nameToFolder(testName)}`,
      '_mock_list.json'
    );

    logger.debug('Reading mock list file', { mocksPath });

    const mocksData = fs.readFileSync(mocksPath, 'utf8');
    const mocks = JSON.parse(mocksData);

    logger.debug('Parsed mock list', { testName, mockCount: mocks.length });

    let successfulLoads = 0;
    let failedLoads = 0;

    mocks.forEach((mock) => {
      const mockFilePath = path.join(
        process.env.MOCK_DIR,
        `test_${nameToFolder(testName)}`,
        `mock_${mock.id}.json`
      );

      try {
        const fileContent = JSON.parse(fs.readFileSync(mockFilePath, 'utf8'));
        mock.fileContent = fileContent;
        successfulLoads++;
        logger.debug('Successfully loaded mock file', {
          testName,
          mockId: mock.id,
          mockFilePath,
        });
      } catch (error) {
        failedLoads++;
        logger.error('Error reading mock file', {
          testName,
          mockId: mock.id,
          mockFilePath,
          error: error.message,
        });
      }
    });

    logger.info('Mock data loaded successfully', {
      testName,
      totalMocks: mocks.length,
      successfulLoads,
      failedLoads,
    });

    return { mocks, testName };
  } catch (error) {
    logger.error('Error loading test data', {
      error: error.message,
      stack: error.stack,
    });
    return [];
  }
};

const loadMockDataFromMockListFile = (mockFolder, mockListFile, testName) => {
  try {
    logger.debug('Loading mock data from mock list file', {
      mockFolder,
      mockListFile,
      testName: testName || 'default',
    });

    const mocksData = fs.readFileSync(
      path.join(mockFolder, mockListFile),
      'utf8'
    );
    const mocks = JSON.parse(mocksData);

    logger.debug('Parsed mock list', {
      testName: testName || 'default',
      mockCount: mocks.length,
    });

    let successfulLoads = 0;
    let failedLoads = 0;

    mocks.forEach((mock) => {
      const mockFilePath = path.join(
        mockFolder,
        testName ? '' : 'defaultMocks',
        `mock_${mock.id}.json`
      );

      try {
        const fileContent = JSON.parse(fs.readFileSync(mockFilePath, 'utf8'));
        mock.fileContent = fileContent;
        successfulLoads++;
        logger.debug('Successfully loaded mock file', {
          testName: testName || 'default',
          mockId: mock.id,
          mockFilePath,
        });
      } catch (error) {
        failedLoads++;
        logger.error('Error reading mock file', {
          testName: testName || 'default',
          mockId: mock.id,
          mockFilePath,
          error: error.message,
        });
      }
    });

    logger.info('Mock data loaded from list file successfully', {
      testName: testName || 'default',
      totalMocks: mocks.length,
      successfulLoads,
      failedLoads,
    });

    return mocks;
  } catch (error) {
    logger.error('Error loading test data from mock list file', {
      mockFolder,
      mockListFile,
      testName: testName || 'default',
      error: error.message,
      stack: error.stack,
    });
    return [];
  }
};

const isSameRequest = (req1, req2) => {
  try {
    logger.debug('Comparing requests', {
      req1Url: req1.url,
      req2Url: req2.url,
      req1Method: req1.method,
      req2Method: req2.method,
    });

    let matched = true;

    if (req1.url !== req2.url) {
      matched = false;
      logger.debug('Requests do not match at URL', {
        req1Url: req1.url,
        req2Url: req2.url,
      });
    } else if (req1.method !== req2.method) {
      matched = false;
      logger.debug('Requests do not match at method', {
        req1Method: req1.method,
        req2Method: req2.method,
      });
    } else if (
      (!req1.postData &&
        req2.postData &&
        req1.method.toUpperCase() !== 'GET') ||
      (req1.postData && !req2.postData && req1.method.toUpperCase() !== 'GET')
    ) {
      matched = areJsonEqual(req1.postData || {}, req2.postData || {});
      logger.debug('Comparing post data with default values', {
        matched,
        req1PostData: req1.postData,
        req2PostData: req2.postData,
      });
    } else if (
      req1.postData &&
      req2.postData &&
      !areJsonEqual(req1.postData, req2.postData)
    ) {
      logger.debug('Post data comparison failed', {
        req1PostData: req1.postData,
        req2PostData: req2.postData,
      });
      console.log('--------start-----------');
      console.log(req1.postData);
      console.log('-------------------');
      console.log(req2.postData);
      console.log('--------end-----------');
      matched = false;
    }

    logger.debug('Request comparison result', { matched });
    return matched;
  } catch (error) {
    logger.error('Error comparing requests', {
      req1: { url: req1?.url, method: req1?.method },
      req2: { url: req2?.url, method: req2?.method },
      error: error.message,
      stack: error.stack,
    });
    console.error(error);
    console.log(req1, req2);
    return false;
  }
};

const isSameResponse = (req1, req2) => {
  try {
    logger.debug('Comparing responses', {
      req1Status: req1.response?.status,
      req2Status: req2.response?.status,
    });

    let matched = true;

    if (req1.response.status !== req2.response.status) {
      matched = false;
      logger.debug('Responses do not match at status', {
        req1Status: req1.response.status,
        req2Status: req2.response.status,
      });
    } else if (
      (!req1.response.content && req2.response.content) ||
      (req1.response.content && !req2.response.content)
    ) {
      matched = areJsonEqual(
        JSON.parse(req1.response.content) || {},
        JSON.parse(req2.response.content) || {}
      );
      logger.debug('Comparing response content with default values', {
        matched,
        req1Content: req1.response.content,
        req2Content: req2.response.content,
      });
    } else if (
      req1.response.content &&
      req2.response.content &&
      !areJsonEqual(
        JSON.parse(req1.response.content) || {},
        JSON.parse(req2.response.content) || {}
      )
    ) {
      matched = false;
      logger.debug('Response content comparison failed', {
        req1Content: req1.response.content,
        req2Content: req2.response.content,
      });
    }

    logger.debug('Response comparison result', { matched });
    return matched;
  } catch (error) {
    logger.error('Error comparing responses', {
      req1Status: req1?.response?.status,
      req2Status: req2?.response?.status,
      error: error.message,
      stack: error.stack,
    });
    console.error(error);
    return false;
  }
};

const compareMockToRequest = (mock, req) => {
  try {
    logger.debug('Comparing mock to request', {
      mockUrl: mock.fileContent?.url,
      reqUrl: req.originalUrl,
      mockMethod: mock.fileContent?.method,
      reqMethod: req.method,
    });

    const mockURL = processURL(
      mock.fileContent.url,
      mock.fileContent.ignoreParams
    );
    const reqURL = processURL(req.originalUrl, mock.fileContent.ignoreParams);
    const postData = mock.fileContent.request?.postData?.text
      ? JSON.parse(mock.fileContent.request?.postData?.text)
      : mock.fileContent.request?.postData;

    const result = isSameRequest(
      { url: mockURL, method: mock.fileContent.method, postData },
      {
        method: req.method,
        postData: req.body,
        url: reqURL,
      }
    );

    logger.debug('Mock to request comparison result', {
      result,
      mockURL,
      reqURL,
    });

    return result;
  } catch (error) {
    logger.error('Error comparing mock to request', {
      mockId: mock?.id,
      reqUrl: req?.originalUrl,
      error: error.message,
      stack: error.stack,
    });
    return false;
  }
};

const compareMockToHarEntry = (mock, harEntry) => {
  try {
    logger.debug('Comparing mock to HAR entry', {
      mockUrl: mock.fileContent?.url,
      harUrl: harEntry.request?.url,
      mockMethod: mock.fileContent?.method,
      harMethod: harEntry.request?.method,
    });

    const mockURL = processURL(
      mock.fileContent.url,
      mock.fileContent.ignoreParams
    );
    const reqURL = processURL(
      harEntry.request.url,
      mock.fileContent.ignoreParams
    );
    const postData = mock.fileContent.request?.postData;

    const result = isSameRequest(
      { url: mockURL, method: mock.fileContent.method, postData },
      {
        method: harEntry.request.method,
        postData: harEntry.request.postData,
        url: reqURL,
      }
    );

    logger.debug('Mock to HAR entry comparison result', {
      result,
      mockURL,
      harURL: reqURL,
    });

    return result;
  } catch (error) {
    logger.error('Error comparing mock to HAR entry', {
      mockId: mock?.id,
      harUrl: harEntry?.request?.url,
      error: error.message,
      stack: error.stack,
    });
    console.error(error);
    return false;
  }
};

const compareMockToMock = (mock1, mock2, matchResponse) => {
  try {
    logger.debug('Comparing mock to mock', {
      mock1Url: mock1?.url,
      mock2Url: mock2?.url,
      mock1Method: mock1?.method,
      mock2Method: mock2?.method,
      matchResponse,
    });

    let result;
    if (matchResponse) {
      result = isSameRequest(mock1, mock2) && isSameResponse(mock1, mock2);
      logger.debug('Mock comparison with response matching', { result });
    } else {
      result = isSameRequest(mock1, mock2);
      logger.debug('Mock comparison without response matching', { result });
    }

    return result;
  } catch (error) {
    logger.error('Error comparing mock to mock', {
      mock1Id: mock1?.id,
      mock2Id: mock2?.id,
      matchResponse,
      error: error.message,
      stack: error.stack,
    });
    console.error(error);
    return false;
  }
};

const removeDuplicates = (jsonArray) => {
  try {
    logger.debug('Removing duplicates from array', {
      originalLength: jsonArray.length,
    });

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

    const removedCount = jsonArray.length - result.length;
    logger.info('Duplicate removal completed', {
      originalLength: jsonArray.length,
      finalLength: result.length,
      removedCount,
    });

    return result;
  } catch (error) {
    logger.error('Error removing duplicates', {
      originalLength: jsonArray?.length,
      error: error.message,
      stack: error.stack,
    });
    return jsonArray; // Return original array on error
  }
};

module.exports = {
  processURL,
  getDefaultMockData,
  getDefaultMockDataSummaryList,
  loadMockDataFromMockListFile,
  loadMockData,
  loadMockDataByTestName,
  isSameRequest,
  areJsonEqual,
  removeDuplicates,
  nameToFolder,
  compareMockToRequest,
  compareMockToHarEntry,
  compareMockToMock,
};
