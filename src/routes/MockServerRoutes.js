const path = require('path');
const fs = require('fs');

const updateMockServerTest = async (testName, port) => {
  try {
    const configPath = path.join(process.env.MOCK_DIR, 'mockServer.config.json');
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    configData.testName = testName;
    configData.port = port;
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
    
    return { message: 'Mock server test updated successfully' };
  } catch (error) {
    return { error: 'Internal server error' };
  }
};

module.exports = {
  updateMockServerTest,
};
