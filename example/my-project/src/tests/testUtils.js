import path from 'path';
import { 
  loadMockDataFromConfig, 
  getDefaultMockDataFromConfig, 
  compareMockToFetchRequest, 
  getMatchingMockData,
  resetAllMockStats
} from 'ftmocks-utils';


export const initiateFetch = async (jest, ftmocksConifg, testName) => {
  const testMockData = testName ? loadMockDataFromConfig(ftmocksConifg, testName) : [];
  resetAllMockStats({testMockData, testConfig: ftmocksConifg, testName});
  const defaultMockData = getDefaultMockDataFromConfig(ftmocksConifg);
  global.fetch = jest.fn((url, options = {}) => {
    let mockData = getMatchingMockData({testMockData, defaultMockData, url, options, testConfig: ftmocksConifg, testName});
    if (mockData) {
      console.debug('mocked', url, options);
    } else {
      console.debug('missing mock data', url, options);
      return Promise.resolve({
        status: 404,
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({ error: 'Mock data not found' }),
      });
    }
  
    const { content, headers, status } = mockData.response;
    
    return Promise.resolve({
      status,
      headers,
      json: () => Promise.resolve(JSON.parse(content)),
    });
  });

  global.XMLHttpRequest = jest.fn(function () {
    const xhrMock = {
      open: jest.fn(),
      send: jest.fn(),
      setRequestHeader: jest.fn(),
      getAllResponseHeaders: jest.fn(() => {
        return '';
      }),
      getResponseHeader: jest.fn((header) => {
        return null;
      }),
      readyState: 4,
      status: 0,
      response: null,
      responseText: '',
      onreadystatechange: null,
      onload: null,
      onerror: null,
    };
  
    xhrMock.send.mockImplementation(function () {
      const mockData = getMatchingMockData({
        testMockData,
        defaultMockData,
        url: xhrMock._url,
        options: xhrMock._options,
        testConfig: ftmocksConifg,
        testName,
      });
  
      if (mockData) {
        console.debug('mocked', xhrMock._url, xhrMock._options);
        const { content, headers, status } = mockData.response;
  
        xhrMock.status = status;
        xhrMock.responseText = content;
        xhrMock.response = content;
        xhrMock.headers = headers;
  
        if (xhrMock.onreadystatechange) {
          xhrMock.onreadystatechange();
        }
        if (xhrMock.onload) {
          xhrMock.onload();
        }
      } else {
        console.debug('missing mock data', xhrMock._url, xhrMock._options);
  
        xhrMock.status = 404;
        xhrMock.responseText = JSON.stringify({ error: 'Mock data not found' });
        xhrMock.response = xhrMock.responseText;
  
        if (xhrMock.onreadystatechange) {
          xhrMock.onreadystatechange();
        }
        if (xhrMock.onerror) {
          xhrMock.onerror();
        }
      }
    });
  
    xhrMock.open.mockImplementation(function (method, url) {
      xhrMock._options = { method };
      xhrMock._url = url;
    });
  
    return xhrMock;
  });
  
  return;
};
