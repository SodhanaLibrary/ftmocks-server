const fs = require('fs');
const path = require('path');
const logger = require('../utils/Logger');
const {
  getRelativePath,
  getAbsolutePathWithMockDir,
} = require('../utils/MockUtils');
const { getLatestProjectUrls } = require('../utils/projectUtils');

// Guard raw file reads/writes to env files that are already registered as
// projects, so the endpoints can't be used to read or write arbitrary paths.
const isRegisteredProject = (envFile) => {
  const projectsFile = path.resolve('projects.json');
  if (!fs.existsSync(projectsFile)) {
    return false;
  }
  try {
    const list = JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
    return (
      Array.isArray(list) &&
      list.some(
        (p) => (typeof p === 'string' ? p : p && p.env_file) === envFile
      )
    );
  } catch {
    return false;
  }
};

const getEnvProject = async (req, res) => {
  try {
    logger.info('Getting environment project configuration');
    const absolutePlaywrightDir = getAbsolutePathWithMockDir(
      process.env.PLAYWRIGHT_DIR
    );
    const absoluteFallbackDir = getAbsolutePathWithMockDir(
      process.env.FALLBACK_DIR
    );
    process.env.RELATIVE_MOCK_DIR_FROM_PLAYWRIGHT_DIR = getRelativePath(
      absolutePlaywrightDir,
      process.env.MOCK_DIR
    );
    process.env.RELATIVE_FALLBACK_DIR_FROM_PLAYWRIGHT_DIR = getRelativePath(
      absolutePlaywrightDir,
      absoluteFallbackDir
    );
    if (process.env.REACT_TESTS_DIR) {
      const absoluteReactTestsDir = getAbsolutePathWithMockDir(
        process.env.REACT_TESTS_DIR
      );
      process.env.RELATIVE_MOCK_DIR_FROM_REACT_TESTS_DIR = getRelativePath(
        absoluteReactTestsDir,
        process.env.MOCK_DIR
      );
    }
    if (process.env.ANGULAR_TESTS_DIR) {
      const absoluteAngularTestsDir = getAbsolutePathWithMockDir(
        process.env.ANGULAR_TESTS_DIR
      );
      process.env.RELATIVE_MOCK_DIR_FROM_ANGULAR_TESTS_DIR = getRelativePath(
        absoluteAngularTestsDir,
        process.env.MOCK_DIR
      );
    }
    const envConfig = {
      MOCK_DIR: process.env.MOCK_DIR,
      PORT: process.env.PORT,
      PREFERRED_SERVER_PORTS: process.env.PREFERRED_SERVER_PORTS,
      MATCH_HEADERS: process.env.MATCH_HEADERS ?? '',
      PLAYWRIGHT_DIR: process.env.PLAYWRIGHT_DIR,
      FALLBACK_DIR: process.env.FALLBACK_DIR,
      PROJECT_TYPE: process.env.PROJECT_TYPE || 'playwright',
      REACT_TESTS_DIR: process.env.REACT_TESTS_DIR,
      RELATIVE_MOCK_DIR_FROM_REACT_TESTS_DIR:
        process.env.RELATIVE_MOCK_DIR_FROM_REACT_TESTS_DIR,
      ANGULAR_TESTS_DIR: process.env.ANGULAR_TESTS_DIR,
      RELATIVE_MOCK_DIR_FROM_ANGULAR_TESTS_DIR:
        process.env.RELATIVE_MOCK_DIR_FROM_ANGULAR_TESTS_DIR,
      RELATIVE_MOCK_DIR_FROM_PLAYWRIGHT_DIR:
        process.env.RELATIVE_MOCK_DIR_FROM_PLAYWRIGHT_DIR,
      RELATIVE_FALLBACK_DIR_FROM_PLAYWRIGHT_DIR:
        process.env.RELATIVE_FALLBACK_DIR_FROM_PLAYWRIGHT_DIR,
      MetaData: getLatestProjectUrls(),
    };

    logger.debug('Environment configuration retrieved', {
      MOCK_DIR: envConfig.MOCK_DIR,
      PORT: envConfig.PORT,
      PREFERRED_SERVER_PORTS: envConfig.PREFERRED_SERVER_PORTS,
      MATCH_HEADERS: envConfig.MATCH_HEADERS,
      hasMockDir: !!envConfig.MOCK_DIR,
      hasPort: !!envConfig.PORT,
      hasPreferredPorts: !!envConfig.PREFERRED_SERVER_PORTS,
      hasMatchHeaders: !!envConfig.MATCH_HEADERS,
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

// GET /api/v1/env/file?env_file=<path> - read raw env file contents
const getEnvFile = async (req, res) => {
  try {
    const envFile = req.query.env_file;
    if (!envFile || typeof envFile !== 'string') {
      return res
        .status(400)
        .json({ error: 'Missing or invalid env_file query parameter' });
    }
    if (!isRegisteredProject(envFile)) {
      return res
        .status(403)
        .json({ error: 'env_file is not a registered project' });
    }
    if (!fs.existsSync(envFile)) {
      return res
        .status(200)
        .json({ env_file: envFile, exists: false, content: '' });
    }
    const content = fs.readFileSync(envFile, 'utf8');
    res.status(200).json({ env_file: envFile, exists: true, content });
  } catch (error) {
    logger.error('Error reading env file', { error: error.message });
    res.status(500).json({ error: 'Failed to read env file' });
  }
};

// PUT /api/v1/env/file { env_file, content } - write raw env file contents
const saveEnvFile = async (req, res) => {
  try {
    const { env_file: envFile, content } = req.body || {};
    if (!envFile || typeof envFile !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid env_file' });
    }
    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid content' });
    }
    if (!envFile.endsWith('.env')) {
      return res
        .status(400)
        .json({ error: 'Only .env files can be saved' });
    }
    if (!isRegisteredProject(envFile)) {
      return res
        .status(403)
        .json({ error: 'env_file is not a registered project' });
    }
    fs.mkdirSync(path.dirname(envFile), { recursive: true });
    fs.writeFileSync(envFile, content, 'utf8');
    logger.info('Saved env file', { envFile });
    res.status(200).json({ success: true, env_file: envFile });
  } catch (error) {
    logger.error('Error saving env file', { error: error.message });
    res.status(500).json({ error: 'Failed to save env file' });
  }
};

module.exports = {
  getEnvProject,
  getEnvFile,
  saveEnvFile,
};
