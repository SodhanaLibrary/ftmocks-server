const path = require('path');
const fs = require('fs');
const logger = require('../utils/Logger');
const {
  getRelativePath,
  getAbsolutePathWithMockDir,
  getRelativePathWithCurrentDir,
} = require('../utils/MockUtils');
const { getLatestProjectUrls } = require('../utils/projectUtils');

const getEnvProject = async (req, res) => {
  try {
    logger.info('Getting environment project configuration');
    const absolutePlaywrightDir = getAbsolutePathWithMockDir(
      process.env.PLAYWRIGHT_DIR
    );
    let absoluteFallbackDir = getAbsolutePathWithMockDir(
      process.env.FALLBACK_DIR
    );
    // absoluteFallbackDir = getRelativePathWithCurrentDir(
    //   absoluteFallbackDir,
    //   absolutePlaywrightDir
    // );
    const envConfig = {
      MOCK_DIR: process.env.MOCK_DIR,
      PORT: process.env.PORT,
      PREFERRED_SERVER_PORTS: process.env.PREFERRED_SERVER_PORTS,
      PLAYWRIGHT_DIR: process.env.PLAYWRIGHT_DIR,
      FALLBACK_DIR: process.env.FALLBACK_DIR,
      RELATIVE_MOCK_DIR_FROM_PLAYWRIGHT_DIR: getRelativePath(
        absolutePlaywrightDir,
        process.env.MOCK_DIR
      ),
      RELATIVE_FALLBACK_DIR_FROM_PLAYWRIGHT_DIR: getRelativePath(
        absolutePlaywrightDir,
        absoluteFallbackDir
      ),
      MetaData: getLatestProjectUrls(),
    };

    logger.debug('Environment configuration retrieved', {
      MOCK_DIR: envConfig.MOCK_DIR,
      PORT: envConfig.PORT,
      PREFERRED_SERVER_PORTS: envConfig.PREFERRED_SERVER_PORTS,
      hasMockDir: !!envConfig.MOCK_DIR,
      hasPort: !!envConfig.PORT,
      hasPreferredPorts: !!envConfig.PREFERRED_SERVER_PORTS,
    });

    res.status(200).json(envConfig);
  } catch (error) {
    logger.error('Error getting environment project configuration', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getEnvProject,
};
