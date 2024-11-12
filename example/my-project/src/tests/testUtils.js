import path from 'path';
import { loadMockDataFromConfig, getDefaultMockDataFromConfig, compareMockToFetchRequest } from 'ftmocks-utils';
import { ftmocksConifg } from './test-config';

export const initiateGlobal = (jest) => {
  global.console = {
    ...console,
    // uncomment to ignore a specific log level
    log: jest.fn(),
    // debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // Deprecated
      removeListener: jest.fn(), // Deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

export const initiateFetch = (jest, testName) => {
  const testMockData = testName ? loadMockDataFromConfig(ftmocksConifg, testName) : [];
  const defaultMockData = getDefaultMockDataFromConfig(ftmocksConifg);
  global.fetch = jest.fn((url, options = {}) => {
    let mymock = testMockData.find(tm => compareMockToFetchRequest(tm, {
      url,
      options
    }));
    if(!mymock) {
      mymock = defaultMockData.find(tm => compareMockToFetchRequest(tm, {
        url,
        options
      }));
    }
    console.debug(defaultMockData, mymock);
    let mockData = mymock ? mymock.fileContent : null;
  
    if (mockData) {
      console.debug('mocked', url);
    } else {
      console.debug('missing mock data', url);
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
};
