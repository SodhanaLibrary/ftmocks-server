const fs = require('fs');
const path = require('path');
    
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
      defaultMockMap.set(processedURL, entry);
    });
    
    return defaultMockMap;
  } catch (error) {
    console.error('Error reading or parsing default.json:', error);
    return [];
  }
}

module.exports = {
    processURL,
    getDefaultMockData
}