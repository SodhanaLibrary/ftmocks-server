const path = require('path');
const fs = require('fs');

const getEnvProject = async (req, res) => {
  try {
    res.status(200).json({
      MOCK_DIR: process.env.MOCK_DIR,
      PORT: process.env.PORT,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getEnvProject,
};
