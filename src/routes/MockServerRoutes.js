const path = require('path');
const fs = require('fs');

const updateMockServerTest = async (testName, port) => {
  try {
    const testsPath = path.join(process.env.MOCK_DIR, 'tests.json');
    const testsData = JSON.parse(fs.readFileSync(testsPath, 'utf8'));
    const test = testsData.find(test => test.name === testName);
    test.port = port;
    fs.writeFileSync(testsPath, JSON.stringify(testsData, null, 2));
    return { message: 'Mock server test updated successfully' };
  } catch (error) {
    return { error: 'Internal server error' };
  }
};

module.exports = {
  updateMockServerTest,
};
