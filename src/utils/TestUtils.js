const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const createTest = (name) => {
  const testsPath = path.join(process.env.MOCK_DIR, 'tests.json');
  let tests = [];
  try {
    // Read existing tests
    const testsData = fs.readFileSync(testsPath, 'utf8');
    tests = JSON.parse(testsData);
    const etest = tests.find((tst) => tst.name === name);
    if (!etest) {
      const newTest = {
        id: uuidv4(),
        name: name,
        mockFile: [],
      };
      tests.push(newTest);
      fs.writeFileSync(testsPath, JSON.stringify(tests, null, 2));

      return;
    } else {
      throw 'Test already exists';
    }
  } catch (error) {
    console.error(`Error reading tests.json:`, error);
  }
};

const getPreviousGetMocks = (mockDataList, index) => {
  try {
    const rmocks = [];
    for (let i = index - 1; i >= 0; i--) {
      if (mockDataList[i].method === 'GET') {
        rmocks.push(mockDataList[i]);
      } else if (
        ['POST', 'PUT', 'DELETE', 'PATCH'].includes(mockDataList[i].method)
      ) {
        break;
      }
    }
    return rmocks;
  } catch (error) {
    console.error(error);
  }
  return [];
};

const getAfterGetMocks = (mockDataList, index) => {
  try {
    const rmocks = [];
    for (let i = index + 1; i < mockDataList.length; i++) {
      if (mockDataList[i].method === 'GET') {
        rmocks.push(mockDataList[i]);
      } else if (
        ['POST', 'PUT', 'DELETE', 'PATCH'].includes(mockDataList[i].method)
      ) {
        break;
      }
    }
    return rmocks;
  } catch (error) {
    console.error(error);
  }
  return [];
};

const getMocksDiffFromDefaultMocks = (name) => {
  const testsPath = path.join(process.env.MOCK_DIR, 'tests.json');
  let tests = [];
  try {
    // Read existing tests
    const testsData = fs.readFileSync(testsPath, 'utf8');
    tests = JSON.parse(testsData);
    const etest = tests.find((tst) => tst.name === name);
    if (!etest) {
      const newTest = {
        id: uuidv4(),
        name: name,
        mockFile: [],
      };
      tests.push(newTest);
      fs.writeFileSync(testsPath, JSON.stringify(tests, null, 2));

      return;
    } else {
      throw 'Test already exists';
    }
  } catch (error) {
    console.error(`Error reading tests.json:`, error);
  }
};
module.exports = {
  createTest,
  getPreviousGetMocks,
  getAfterGetMocks,
};
