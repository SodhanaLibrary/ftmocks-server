const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('./Logger');

const createTest = (name) => {
  const testsPath = path.join(process.env.MOCK_DIR, 'tests.json');
  let tests = [];

  try {
    logger.info('Creating test', { testName: name, testsPath });

    // Read existing tests
    const testsData = fs.readFileSync(testsPath, 'utf8');
    tests = JSON.parse(testsData);

    logger.debug('Loaded existing tests', {
      existingTestCount: tests.length,
      existingTestNames: tests.map((t) => t.name),
    });

    const etest = tests.find((tst) => tst.name === name);
    if (!etest) {
      const newTest = {
        id: uuidv4(),
        name: name,
        mockFile: [],
      };

      logger.debug('Created new test object', {
        testId: newTest.id,
        testName: newTest.name,
      });

      tests.push(newTest);
      fs.writeFileSync(testsPath, JSON.stringify(tests, null, 2));

      logger.info('Test created successfully', {
        testId: newTest.id,
        testName: newTest.name,
        totalTests: tests.length,
      });

      return;
    } else {
      logger.warn('Test already exists', {
        testName: name,
        existingTestId: etest.id,
      });
      throw 'Test already exists';
    }
  } catch (error) {
    logger.error('Error creating test', {
      testName: name,
      testsPath,
      error: error.message,
      stack: error.stack,
    });
    console.error(`Error reading tests.json:`, error);
  }
};

const getPreviousGetMocks = (mockDataList, index) => {
  try {
    logger.debug('Getting previous GET mocks', {
      currentIndex: index,
      totalMocks: mockDataList.length,
    });

    const rmocks = [];
    for (let i = index - 1; i >= 0; i--) {
      const currentMock = mockDataList[i];

      if (currentMock.method === 'GET') {
        rmocks.push(currentMock);
        logger.debug('Added previous GET mock', {
          index: i,
          mockUrl: currentMock.url,
          mockMethod: currentMock.method,
        });
      } else if (
        ['POST', 'PUT', 'DELETE', 'PATCH'].includes(currentMock.method)
      ) {
        logger.debug('Stopped at non-GET method', {
          index: i,
          mockUrl: currentMock.url,
          mockMethod: currentMock.method,
        });
        break;
      }
    }

    logger.info('Retrieved previous GET mocks', {
      currentIndex: index,
      previousGetMocksCount: rmocks.length,
      previousMocks: rmocks.map((m) => ({ url: m.url, method: m.method })),
    });

    return rmocks;
  } catch (error) {
    logger.error('Error getting previous GET mocks', {
      currentIndex: index,
      totalMocks: mockDataList?.length,
      error: error.message,
      stack: error.stack,
    });
    console.error(error);
  }
  return [];
};

const getAfterGetMocks = (mockDataList, index) => {
  try {
    logger.debug('Getting after GET mocks', {
      currentIndex: index,
      totalMocks: mockDataList.length,
    });

    const rmocks = [];
    for (let i = index + 1; i < mockDataList.length; i++) {
      const currentMock = mockDataList[i];

      if (currentMock.method === 'GET') {
        rmocks.push(currentMock);
        logger.debug('Added after GET mock', {
          index: i,
          mockUrl: currentMock.url,
          mockMethod: currentMock.method,
        });
      } else if (
        ['POST', 'PUT', 'DELETE', 'PATCH'].includes(currentMock.method)
      ) {
        logger.debug('Stopped at non-GET method', {
          index: i,
          mockUrl: currentMock.url,
          mockMethod: currentMock.method,
        });
        break;
      }
    }

    logger.info('Retrieved after GET mocks', {
      currentIndex: index,
      afterGetMocksCount: rmocks.length,
      afterMocks: rmocks.map((m) => ({ url: m.url, method: m.method })),
    });

    return rmocks;
  } catch (error) {
    logger.error('Error getting after GET mocks', {
      currentIndex: index,
      totalMocks: mockDataList?.length,
      error: error.message,
      stack: error.stack,
    });
    console.error(error);
  }
  return [];
};

const getMocksDiffFromDefaultMocks = (name) => {
  const testsPath = path.join(process.env.MOCK_DIR, 'tests.json');
  let tests = [];

  try {
    logger.info('Getting mocks diff from default mocks', { testName: name });

    // Read existing tests
    const testsData = fs.readFileSync(testsPath, 'utf8');
    tests = JSON.parse(testsData);

    logger.debug('Loaded existing tests for diff calculation', {
      existingTestCount: tests.length,
      targetTestName: name,
    });

    const etest = tests.find((tst) => tst.name === name);
    if (!etest) {
      logger.info('Test not found, creating new test for diff calculation', {
        testName: name,
      });

      const newTest = {
        id: uuidv4(),
        name: name,
        mockFile: [],
      };

      logger.debug('Created new test for diff calculation', {
        testId: newTest.id,
        testName: newTest.name,
      });

      tests.push(newTest);
      fs.writeFileSync(testsPath, JSON.stringify(tests, null, 2));

      logger.info('New test created for diff calculation', {
        testId: newTest.id,
        testName: newTest.name,
        totalTests: tests.length,
      });

      return;
    } else {
      logger.debug('Test found for diff calculation', {
        testName: name,
        existingTestId: etest.id,
      });
      throw 'Test already exists';
    }
  } catch (error) {
    logger.error('Error getting mocks diff from default mocks', {
      testName: name,
      testsPath,
      error: error.message,
      stack: error.stack,
    });
    console.error(`Error reading tests.json:`, error);
  }
};

const getTestByName = (testName) => {
  const testsPath = path.join(process.env.MOCK_DIR, 'tests.json');
  let tests = [];
  try {
    // Read existing tests
    const testsData = fs.readFileSync(testsPath, 'utf8');
    tests = JSON.parse(testsData);
    const etest = tests.find((tst) => tst.name === testName);
    return etest;
  } catch (error) {
    console.error(`Error reading tests.json:`, error);
    return null;
  }
};

module.exports = {
  createTest,
  getPreviousGetMocks,
  getAfterGetMocks,
  getTestByName,
};
