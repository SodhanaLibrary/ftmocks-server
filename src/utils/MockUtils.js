const fs = require('fs');
const path = require('path');

const areJsonEqual = (jsonObj1, jsonObj2) => {
  // Check if both are objects and not null
  if (typeof jsonObj1 === 'object' && jsonObj1 !== null &&
      typeof jsonObj2 === 'object' && jsonObj2 !== null) {
    
    // Get the keys of both objects
    const keys1 = Object.keys(jsonObj1);
    const keys2 = Object.keys(jsonObj2);
    
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
}
    
const processURL = (url) => {
  // Remove the hostname from the URL
  const urlWithoutHost = url.replace(/^(https?:\/\/)?[^\/]+/, '');
  const processedURL = new URL(`http://domain.com${urlWithoutHost}`);
  const params = new URLSearchParams(processedURL.search);
//   params.delete("endTime");
//   params.delete("startMin");
//   params.delete("startTime");
//   params.delete("startDate");
//   params.delete("endDate");
  params.sort();
  return decodeURIComponent(`${processedURL.pathname}?${params}`);
}

const getDefaultMockData = () => {
    const defaultPath = process.env.MOCK_DIR+'/'+process.env.MOCK_DEFAULT_FILE;

  try {
    const defaultData = fs.readFileSync(defaultPath, 'utf8');
    let parsedData = JSON.parse(defaultData);
    
    // Read and attach mock data for each entry in parsedData
    parsedData = parsedData.map(entry => {
      const mockFilePath = entry.path;
      try {
        const mockData = fs.readFileSync(mockFilePath, 'utf8');
        return JSON.parse(mockData);
      } catch (error) {
        console.error(`Error reading mock data for ${entry.path}:`, error);
        return entry; // Return the original entry if there's an error
      }
    });
    // Create a map with processedURL as key
    const defaultMockMap = new Map();
    parsedData.forEach(entry => {
      const processedURL = processURL(entry.url);
      defaultMockMap.set(`${entry.method}'___'${processedURL}`, entry);
    });
    
    return defaultMockMap;
  } catch (error) {
    console.error('Error reading or parsing default.json:', error);
    return [];
  }
}

const getDefaultMockDataSummaryList = () => {
  const defaultPath = process.env.MOCK_DIR+'/'+process.env.MOCK_DEFAULT_FILE;

  try {
    const defaultData = fs.readFileSync(defaultPath, 'utf8');
    let parsedData = JSON.parse(defaultData);
    return parsedData;
  } catch (error) {
    console.error('Error reading or parsing default.json:', error);
    return [];
  }
}

const loadMockData = () => {
  try {
    // Read the test ID from mockServer.config.json
    const configPath = path.join(process.env.MOCK_DIR, 'mockServer.config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    const testId = config.testId;

    // Read the tests from tests.json
    const mocksPath = path.join(process.env.MOCK_DIR, `test_${testId}.json`);
    const mocksData = fs.readFileSync(mocksPath, 'utf8');
    const mocks = JSON.parse(mocksData);

    const mockData = new Map(mocks.map(mock => {
      const fileContent = JSON.parse(fs.readFileSync(mock.path, 'utf8'));
      return [`${fileContent.method}'___'${processURL(fileContent.url)}`, fileContent];
    }));

    return mockData;
  } catch (error) {
    console.error('Error loading test data:', error.message);
    return null;
  }
}

const loadMockDataList = () => {
  try {
    // Read the test ID from mockServer.config.json
    const configPath = path.join(process.env.MOCK_DIR, 'mockServer.config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    const testId = config.testId;

    // Read the tests from tests.json
    const mocksPath = path.join(process.env.MOCK_DIR, `test_${testId}.json`);
    const mocksData = fs.readFileSync(mocksPath, 'utf8');
    const mocks = JSON.parse(mocksData);

    const mockData = mocks.map(mock => {
      const fileContent = JSON.parse(fs.readFileSync(mock.path, 'utf8'));
      return fileContent;
    });

    return mockData;
  } catch (error) {
    console.error('Error loading test data:', error.message);
    return null;
  }
}

const isSameRequest = (req1, req2) => {
  let matched = true;
  if(req1.url !== req2.url) {
    matched = false;
  } else if(req1.method !== req2.method) {
    matched = false;
  } else if(!areJsonEqual(req1.postData ,  req2.postData)) {
    matched = false;
  }
  return matched;
}

const removeDuplicates = (jsonArray) => {
  const uniqueObjects = new Set();

  // Filter the array and only keep unique objects
  const result = jsonArray.filter(item => {
    const itemString = JSON.stringify(item);
    
    // Check if this object is already in the Set
    if (!uniqueObjects.has(itemString)) {
      uniqueObjects.add(itemString);
      return true; // Keep this item
    }

    return false; // Exclude this item (it's a duplicate)
  });

  return result;
}


module.exports = {
    processURL,
    getDefaultMockData,
    getDefaultMockDataSummaryList,
    loadMockData,
    loadMockDataList,
    isSameRequest,
    areJsonEqual,
    removeDuplicates
}