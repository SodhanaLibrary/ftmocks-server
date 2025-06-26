const path = require('path');
const fs = require('fs');
const logger = require('../utils/Logger');

const updateMockServerTest = async (testName, port) => {
  try {
    logger.info('Updating mock server test configuration', {
      testName,
      port,
      configPath: path.join(process.env.MOCK_DIR, 'mockServer.config.json'),
    });

    const configPath = path.join(
      process.env.MOCK_DIR,
      'mockServer.config.json'
    );

    // Check if config file exists
    if (!fs.existsSync(configPath)) {
      logger.warn('Mock server config file does not exist, creating new file', {
        configPath,
      });
      // Create default config structure
      const defaultConfig = {
        testName: '',
        port: 3000,
      };
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
      logger.info('Created new mock server config file', { configPath });
    }

    // Read existing configuration
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    logger.debug('Current mock server configuration', {
      currentTestName: configData.testName,
      currentPort: configData.port,
      configPath,
    });

    // Update configuration
    const previousTestName = configData.testName;
    const previousPort = configData.port;

    configData.testName = testName;
    configData.port = port;

    // Write updated configuration
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));

    logger.info('Mock server test configuration updated successfully', {
      previousTestName,
      newTestName: testName,
      previousPort,
      newPort: port,
      configPath,
    });

    return { message: 'Mock server test updated successfully' };
  } catch (error) {
    logger.error('Error updating mock server test configuration', {
      testName,
      port,
      configPath: path.join(process.env.MOCK_DIR, 'mockServer.config.json'),
      error: error.message,
      stack: error.stack,
    });
    return { error: 'Internal server error' };
  }
};

module.exports = {
  updateMockServerTest,
};
