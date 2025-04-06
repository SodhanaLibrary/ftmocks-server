const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const {
  getDefaultMockData,
  processURL,
  loadMockData,
  nameToFolder,
  compareMockToRequest,
  loadMockDataByTestName,
} = require('../utils/MockUtils');

const getRecordedProjects = async (req, res) => {
  const defaultPath = 'projects.json';

  try {
    const defaultData = fs.readFileSync(defaultPath, 'utf8');
    let parsedData = JSON.parse(defaultData);

    res.status(200).json(parsedData);
  } catch (error) {
    console.error(`Error reading or parsing default.json:`, error);
    res.status(200).json([]);
  }
};

const switchProject = async (req, res) => {
  const project_env_file = req.body.env_file;
  if (fs.existsSync(project_env_file)) {
    const result = require('dotenv').config({ path: project_env_file });
    process.env.MOCK_DIR = result.parsed.MOCK_DIR;
    process.env.PREFERRED_SERVER_PORTS = result.parsed.PREFERRED_SERVER_PORTS;
    process.env.MOCK_RECORDER_LIMIT = result.parsed.MOCK_RECORDER_LIMIT;
    console.log(process.env.MOCK_DIR);
    if (!path.isAbsolute(process.env.MOCK_DIR)) {
      process.env.MOCK_DIR = path.resolve(
        path.dirname(project_env_file),
        process.env.MOCK_DIR
      );
      console.log('absolute path MOCK_DIR', process.env.MOCK_DIR);
    }
    res.status(200).json({ message: 'env file loaded successfully' });
  } else {
    console.error(`Error reading or env file:`, project_env_file);
    res.status(404).json('File not found');
  }
};

const ignoreForAll = async (req, res) => {
  const testName = req.body.testName;
  const param = req.body.param;
  const defaultMockData = getDefaultMockData();
  defaultMockData.forEach((mock) => {
    if (!mock.fileContent.ignoreParams) {
      mock.fileContent.ignoreParams = [];
    }
    if (
      mock?.fileContent?.request?.queryString &&
      !mock.fileContent.request.queryString.map
    ) {
      const qObj = Object.fromEntries(
        new URLSearchParams(mock.fileContent.request.queryString)
      );
      mock.fileContent.request.queryString = Object.keys(qObj).map((name) => ({
        name,
        value: qObj[name],
      }));
    }
    console.log(mock?.fileContent?.request?.queryString);
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
      fs.writeFileSync(mockFilePath, JSON.stringify(mock.fileContent, null, 2));
    }
  });
  if (testName) {
    const testMockData = loadMockDataByTestName(testName);
    testMockData.mocks.forEach((mock) => {
      try {
        if (!mock?.fileContent?.ignoreParams) {
          mock.fileContent.ignoreParams = [];
        }
        const cparams =
          mock?.fileContent?.request?.queryString?.map((qs) => qs.name) || [];
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
        }
      } catch (error) {
        console.error(`Error updating mock data:`, error);
        console.error(mock.fileContent);
      }
    });
  }
  res.status(200).json({ message: 'Updated successfully' });
};

module.exports = {
  getRecordedProjects,
  switchProject,
  ignoreForAll,
};
