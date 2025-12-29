const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/Logger');
const {
  getDefaultMockData,
  processURL,
  loadMockData,
  nameToFolder,
  compareMockToRequest,
  loadMockDataByTestName,
} = require('../utils/MockUtils');

const loadEnvVariables = (project_env_file) => {
  logger.info('Loading environment variables', { envFile: project_env_file });

  if (!fs.existsSync(project_env_file)) {
    logger.error('Environment file not found', { envFile: project_env_file });
    return;
  }

  const result = require('dotenv').config({ path: project_env_file });

  // Log the loaded environment variables
  process.env.MOCK_DIR = result.parsed.MOCK_DIR;
  process.env.PREFERRED_SERVER_PORTS = result.parsed.PREFERRED_SERVER_PORTS;
  process.env.PLAYWRIGHT_DIR = result.parsed.PLAYWRIGHT_DIR;
  process.env.FALLBACK_DIR = result.parsed.FALLBACK_DIR;
  process.env.EXCLUDED_HEADERS =
    result.parsed.EXCLUDED_HEADERS ||
    `cookie,set-cookie,authorization,www-authenticate`;

  if (!path.isAbsolute(process.env.MOCK_DIR)) {
    const originalMockDir = process.env.MOCK_DIR;
    process.env.MOCK_DIR = path.resolve(
      path.dirname(project_env_file),
      process.env.MOCK_DIR
    );
  }

  let prs = [];
  const urls = [];
  const projectsFile = 'projects.json';
  if (!fs.existsSync(projectsFile)) {
    fs.writeFileSync(projectsFile, '[]');
  } else {
    const defaultData = fs.readFileSync(projectsFile, 'utf8');
    prs = JSON.parse(defaultData);
    if (Array.isArray(prs) && typeof prs[0] === 'string') {
      prs = prs.map((aPr) => ({ env_file: aPr }));
    }
  }
  let currProject = prs.find((aPr) => aPr.env_file === project_env_file);
  if (!currProject) {
    currProject = { env_file: project_env_file, urls: [] };
  } else {
    prs = prs.filter((aPr) => aPr.env_file !== project_env_file);
  }
  prs.unshift(currProject);
  prs = [...new Set(prs.map((aPr) => aPr.env_file))].map((env_file) =>
    prs.find((aPr) => aPr.env_file === env_file)
  ); // Remove any duplicates
  fs.writeFileSync(projectsFile, JSON.stringify(prs, null, 2));

  logger.info('Environment variables loaded successfully', {
    envFile: project_env_file,
    finalMockDir: process.env.MOCK_DIR,
  });
};

const loadFtMocksEnvVariables = () => {
  if (fs.existsSync('.env')) {
    const result = require('dotenv').config({ path: '.env' });
    process.env.OPENAI_API_KEY = result.parsed.OPENAI_API_KEY;
  }
};

const getRecordedProjects = async (req, res) => {
  const defaultPath = 'projects.json';

  try {
    logger.info('Getting recorded projects', { projectsFile: defaultPath });

    if (!fs.existsSync(defaultPath)) {
      logger.warn('Projects file does not exist, returning empty array', {
        projectsFile: defaultPath,
      });
      return res.status(200).json([]);
    }

    const defaultData = fs.readFileSync(defaultPath, 'utf8');
    let parsedData = JSON.parse(defaultData);

    logger.info('Successfully retrieved recorded projects', {
      projects: parsedData,
    });

    res.status(200).json(parsedData);
  } catch (error) {
    logger.error('Error reading or parsing projects file', {
      projectsFile: defaultPath,
      error: error.message,
      stack: error.stack,
    });
    res.status(200).json([]);
  }
};

const switchProject = async (req, res) => {
  const project_env_file = req.body.env_file;

  try {
    loadEnvVariables(project_env_file);
    res.status(200).json({ message: 'env file loaded successfully' });
  } catch (error) {
    logger.error('Error switching project', {
      envFile: project_env_file,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const ignoreForAll = async (req, res) => {
  const testName = req.body.testName;
  const param = req.body.param;

  try {
    logger.info('Adding parameter to ignore list for all mocks', {
      testName: testName || 'all tests',
      param,
      includeTestMocks: !!testName,
    });

    // Process default mocks
    logger.debug('Processing default mocks for ignore parameter');
    const defaultMockData = getDefaultMockData();
    let defaultMocksUpdated = 0;

    defaultMockData.forEach((mock) => {
      try {
        if (!mock.fileContent.ignoreParams) {
          mock.fileContent.ignoreParams = [];
        }

        // Handle query string format conversion
        if (
          mock?.fileContent?.request?.queryString &&
          !mock.fileContent.request.queryString.map
        ) {
          logger.debug('Converting query string format', {
            mockId: mock.fileContent.id,
          });
          const qObj = Object.fromEntries(
            new URLSearchParams(mock.fileContent.request.queryString)
          );
          mock.fileContent.request.queryString = Object.keys(qObj).map(
            (name) => ({
              name,
              value: qObj[name],
            })
          );
        }

        const cparams =
          mock?.fileContent?.request?.queryString?.map((qs) => qs.name) || [];

        if (
          !mock.fileContent.ignoreParams.includes(param) &&
          cparams.includes(param)
        ) {
          mock.fileContent.ignoreParams.push(param);
          const mockFilePath = path.join(
            process.env.MOCK_DIR,
            'defaultMocks',
            `mock_${mock.fileContent.id}.json`
          );
          fs.writeFileSync(
            mockFilePath,
            JSON.stringify(mock.fileContent, null, 2)
          );
          defaultMocksUpdated++;

          logger.debug('Updated default mock with ignore parameter', {
            mockId: mock.fileContent.id,
            param,
            ignoreParams: mock.fileContent.ignoreParams,
          });
        }
      } catch (error) {
        logger.error('Error updating default mock', {
          mockId: mock.fileContent?.id,
          param,
          error: error.message,
        });
      }
    });

    logger.info('Default mocks processing completed', {
      totalDefaultMocks: defaultMockData.length,
      updatedDefaultMocks: defaultMocksUpdated,
    });

    // Process test-specific mocks if testName is provided
    if (testName) {
      logger.debug('Processing test-specific mocks', { testName });
      let testMocksUpdated = 0;

      const testMockData = loadMockDataByTestName(testName);

      if (!testMockData || !testMockData.mocks) {
        logger.warn('No test mock data found', { testName });
      } else {
        testMockData.mocks.forEach((mock) => {
          try {
            if (!mock?.fileContent?.ignoreParams) {
              mock.fileContent.ignoreParams = [];
            }

            const cparams =
              mock?.fileContent?.request?.queryString?.map((qs) => qs.name) ||
              [];

            if (
              !mock?.fileContent?.ignoreParams.includes(param) &&
              cparams.includes(param)
            ) {
              mock.fileContent.ignoreParams.push(param);
              const mockFilePath = path.join(
                process.env.MOCK_DIR,
                `test_${nameToFolder(testName)}`,
                `mock_${mock.fileContent.id}.json`
              );
              fs.writeFileSync(
                mockFilePath,
                JSON.stringify(mock.fileContent, null, 2)
              );
              testMocksUpdated++;

              logger.debug('Updated test mock with ignore parameter', {
                testName,
                mockId: mock.fileContent.id,
                param,
                ignoreParams: mock.fileContent.ignoreParams,
              });
            }
          } catch (error) {
            logger.error('Error updating test mock', {
              testName,
              mockId: mock.fileContent?.id,
              param,
              error: error.message,
              mockContent: mock.fileContent,
            });
          }
        });
      }
    }

    logger.info('Ignore parameter operation completed successfully', {
      param,
      testName: testName || 'all tests',
    });

    res.status(200).json({ message: 'Updated successfully' });
  } catch (error) {
    logger.error('Error in ignoreForAll operation', {
      testName,
      param,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const removeProject = async (req, res) => {
  const project = req.body.env_file;
  const defaultPath = 'projects.json';

  try {
    logger.info('Getting recorded projects', { projectsFile: defaultPath });

    if (!fs.existsSync(defaultPath)) {
      logger.warn('Projects file does not exist, returning empty array', {
        projectsFile: defaultPath,
      });
      return res.status(200).json([]);
    }

    const defaultData = fs.readFileSync(defaultPath, 'utf8');
    let parsedData = JSON.parse(defaultData);

    logger.info('Successfully retrieved recorded projects', {
      projects: parsedData,
    });

    const newData = parsedData.filter((p) => p.env_file !== project);

    fs.writeFileSync(defaultPath, JSON.stringify(newData, null, 2));

    res.status(200).json(newData);
  } catch (error) {
    logger.error('Error reading or parsing projects file', {
      projectsFile: defaultPath,
      error: error.message,
      stack: error.stack,
    });
    res.status(200).json([]);
  }
};

const addProject = async (req, res) => {
  const project = req.body.project;
  const defaultPath = 'projects.json';

  try {
    logger.info('Getting recorded projects', { projectsFile: defaultPath });

    if (!fs.existsSync(defaultPath)) {
      fs.writeFileSync(defaultPath, JSON.stringify([], null, 2));
    }

    const defaultData = fs.readFileSync(defaultPath, 'utf8');
    let parsedData = JSON.parse(defaultData);

    parsedData.unshift({ env_file: project });

    fs.writeFileSync(defaultPath, JSON.stringify(parsedData, null, 2));

    res.status(200).json(parsedData);
  } catch (error) {
    logger.error('Error reading or parsing projects file', {
      projectsFile: defaultPath,
      error: error.message,
      stack: error.stack,
    });
  }
};

const getLatestProject = () => {
  const defaultPath = 'projects.json';
  if (!fs.existsSync(defaultPath)) {
    return null;
  }
  const defaultData = fs.readFileSync(defaultPath, 'utf8');
  const parsedData = JSON.parse(defaultData);
  return parsedData?.length > 0 ? parsedData[0].env_file : 'my-project.env';
};

module.exports = {
  getRecordedProjects,
  switchProject,
  ignoreForAll,
  removeProject,
  addProject,
  loadEnvVariables,
  loadFtMocksEnvVariables,
  getLatestProject,
};
