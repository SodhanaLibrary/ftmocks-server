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
module.exports = {
  createTest,
};
