const path = require('path');
const fs = require('fs');
const logger = require('../utils/Logger');

const getEnvProject = async (req, res) => {
  try {
    logger.info('Getting environment project configuration');

    const envConfig = {
      MOCK_DIR: process.env.MOCK_DIR,
      PORT: process.env.PORT,
      PREFERRED_SERVER_PORTS: process.env.PREFERRED_SERVER_PORTS,
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
