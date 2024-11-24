const path = require('path');
const fs = require('fs');

const getEnvProject = async (req, res) => {
  try {
    res.status(200).json({
      MOCK_DIR: process.env.MOCK_DIR,
      PORT: process.env.PORT,
      MOCK_DEFAULT_FILE: process.env.MOCK_DEFAULT_FILE,
      MOCK_DEFAULT_DIR: process.env.MOCK_DEFAULT_DIR,
      MOCK_TEST_FILE: process.env.MOCK_TEST_FILE,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getEnvProject,
};
