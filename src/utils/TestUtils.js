const fs = require('fs');
const path = require('path');

const getTestByName = (testName) => {
  const testsPath = path.join(process.env.MOCK_DIR, 'tests.json');
  try {
    const testsData = fs.readFileSync(testsPath, 'utf8');
    const tests = JSON.parse(testsData);
    return tests.find((tst) => tst.name === testName);
  } catch (error) {
    console.error(`Error reading tests.json:`, error);
    return null;
  }
};

module.exports = {
  getTestByName,
};
