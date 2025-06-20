const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const {
  processHAR,
  createMockFromUserInputForTest,
} = require('../utils/MockGenerator');
const { nameToFolder } = require('../utils/MockUtils');

const getTests = async (req, res) => {
  const indexPath = path.join(process.env.MOCK_DIR, 'tests.json');
  try {
    if (!fs.existsSync(indexPath)) {
      await fs.appendFile(indexPath, '[]', () => {
        console.log('file created successfully', indexPath);
      });
    }
    const indexData = fs.readFileSync(indexPath, 'utf8');
    const parsedData = JSON.parse(indexData || '[]');

    // Map the data to a more suitable format for the response
    const formattedData = parsedData.map((item) => ({
      id: item.id,
      name: item.name,
      mockFile: item.mockFile,
    }));

    res.status(200).json(formattedData);
  } catch (error) {
    console.error('Error reading or parsing index.json:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteTest = async (req, res) => {
  const fs = require('fs');
  const path = require('path');

  const testId = req.params.id;
  const testName = req.query.name;
  const testsPath = path.join(process.env.MOCK_DIR, 'tests.json');

  try {
    let testsData = fs.readFileSync(testsPath, 'utf8');
    let tests = JSON.parse(testsData);

    const testIndex = tests.findIndex((test) => test.id === testId);
    const folderPath = path.join(
      process.env.MOCK_DIR,
      `test_${nameToFolder(testName)}`
    );
    if (fs.existsSync(folderPath)) {
      fs.rmdirSync(folderPath, { recursive: true });
    }
    if (testIndex === -1) {
      return res.status(404).json({ error: 'Test not found' });
    }

    tests.splice(testIndex, 1);

    fs.writeFileSync(testsPath, JSON.stringify(tests, null, 2));

    res.status(200).json({ message: 'Test deleted successfully' });
  } catch (error) {
    console.error('Error deleting test:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createTest = async (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const testsPath = path.join(process.env.MOCK_DIR, 'tests.json');
  let tests = [];
  try {
    // Read existing tests
    const testsData = fs.readFileSync(testsPath, 'utf8');
    tests = JSON.parse(testsData);
    const etest = tests.find((tst) => tst.name === req.body.name);
    if (!etest) {
      const newTest = {
        id: uuidv4(),
        name: req.body.name,
        mockFile: [],
      };
      tests.push(newTest);
      fs.writeFileSync(testsPath, JSON.stringify(tests, null, 2));
      const folderPath = path.join(
        process.env.MOCK_DIR,
        `test_${nameToFolder(req.body.name)}`
      );
      const mockListFilePath = path.join(folderPath, '_mock_list.json');
      fs.mkdir(folderPath, { recursive: true }, (err) => {
        if (err) {
          console.error('Error creating directory:', err);
        } else {
          console.log('Directory created successfully!');
        }
      });
      await fs.appendFile(mockListFilePath, '[]', () => {
        console.log('mock list file created successfully');
      });

      res.status(201).json({
        message: 'New test created successfully',
        test: newTest,
      });
      return;
    } else {
      throw 'Test already exists';
    }
  } catch (error) {
    console.error(`Error reading tests.json:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const updateTest = async (req, res) => {
  const testId = req.params.id;
  const updatedTest = req.body;

  try {
    const testsPath = path.join(process.env.MOCK_DIR, 'tests.json');
    let testsData = JSON.parse(fs.readFileSync(testsPath, 'utf8'));

    const testIndex = testsData.findIndex((test) => test.id === testId);
    if (testIndex === -1) {
      return res.status(404).json({ error: 'Test not found' });
    }

    const testFolder = path.join(
      process.env.MOCK_DIR,
      `test_${nameToFolder(testsData[testIndex].name)}`
    );
    if (fs.existsSync(testFolder)) {
      fs.renameSync(
        testFolder,
        path.join(
          process.env.MOCK_DIR,
          `test_${nameToFolder(updatedTest.name)}`
        ),
        (err) => {
          if (err) {
            throw err;
          }
        }
      );
    }

    testsData[testIndex].name = updatedTest.name;
    testsData[testIndex].mockFile =
      `test_${nameToFolder(updatedTest.name)}/_mock_list.json`;

    fs.writeFileSync(testsPath, JSON.stringify(testsData, null, 2));

    res.status(200).json({ message: 'Test updated successfully' });
  } catch (error) {
    console.error('Error updating test:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const util_getMockDataForTest = (testName) => {
  const testDataPath = path.join(
    process.env.MOCK_DIR,
    `test_${nameToFolder(testName)}`,
    '_mock_list.json'
  );
  // Read the mock data from the test-specific file
  let mockData = [];
  if (fs.existsSync(testDataPath)) {
    mockData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));
  }
  // Read data from path attribute file names and assign as mockData
  const updatedMockData = mockData.map((item) => {
    try {
      const fileContent = fs.readFileSync(
        path.join(
          process.env.MOCK_DIR,
          `test_${nameToFolder(testName)}`,
          `mock_${item.id}.json`
        ),
        'utf8'
      );
      return JSON.parse(fileContent);
    } catch (error) {
      console.error(`Error reading file ${item.id}:`, error);
      return item; // Return the original item if there's an error
    }
  });
  return updatedMockData;
};

const getMockDataForTest = async (req, res) => {
  const testName = req.query.name;
  try {
    const updatedMockData = util_getMockDataForTest(testName);
    res.status(200).json(updatedMockData);
  } catch (error) {
    console.error('Error reading mock data:', error);
    res.status(500).json({ error: 'Failed to retrieve mock data' });
  }
};

const createMockDataForTest = async (req, res) => {
  const testName = req.query.name;
  const mockData = req.body;
  try {
    createMockFromUserInputForTest(mockData, testName);
    res.status(200).json({ message: 'Uploaded successfully' });
  } catch (error) {
    console.error('Error adding mock data:', error);
    res.status(500).json({ error: 'Failed to add mock data' });
  }
};

const deleteMockDataForTest = async (req, res) => {
  const testId = req.params.id;
  const mockId = req.params.mockId;
  const testName = req.query.name;

  try {
    const tetFilePath = path.join(
      process.env.MOCK_DIR,
      `test_${nameToFolder(testName)}`,
      `_mock_list.json`
    );

    // Read and parse the mock data file
    let mockData = JSON.parse(fs.readFileSync(tetFilePath, 'utf8'));

    // Remove the mock record with the given mockId
    mockData = mockData.filter((mock) => mock.id !== mockId);

    // Write the updated mock data back to the file
    fs.writeFileSync(tetFilePath, JSON.stringify(mockData, null, 2));

    // Delete the mock file associated with the mockId
    const mockFileName = `mock_${mockId}.json`;
    const mockFilePath = path.join(
      process.env.MOCK_DIR,
      `test_${nameToFolder(testName)}`,
      mockFileName
    );

    if (fs.existsSync(mockFilePath)) {
      fs.unlinkSync(mockFilePath);
      console.log(`Deleted mock file: ${mockFilePath}`);
    } else {
      console.warn(`Mock file not found: ${mockFilePath}`);
    }

    res.status(200).json({ message: 'Mock data deleted successfully' });
  } catch (error) {
    console.error('Error deleting mock data:', error);
    res.status(500).json({ error: 'Failed to delete mock data' });
  }
};

const resetMockDataForTest = async (req, res) => {
  const currentTest = req.body;

  try {
    currentTest.mockData.forEach((mockData) => {
      const mockFilePath = path.join(
        process.env.MOCK_DIR,
        `test_${nameToFolder(currentTest.name)}`,
        `mock_${mockData.id}.json`
      );
      mockData.served = false;
      fs.writeFileSync(mockFilePath, JSON.stringify(mockData, null, 2));
    });
    res.json(currentTest);
  } catch (error) {
    console.error('Error updating mock data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createHarMockDataForTest = async (req, res) => {
  const testId = req.params.id;
  const testsPath = path.join(process.env.MOCK_DIR, 'tests.json');

  if (!req.file) {
    return res.status(400).json({ error: 'No HAR file uploaded' });
  }

  try {
    // Read and parse the 'tests.json' file
    const testsData = JSON.parse(fs.readFileSync(testsPath, 'utf8'));

    // Find the test with the given id
    const testIndex = testsData.findIndex((test) => test.id === testId);

    if (testIndex === -1) {
      return res.status(404).json({ error: 'Test not found' });
    }

    const harFilePath = req.file.path;
    const testName = nameToFolder(req.body.testName);

    console.log('avoidDuplicates = ', req.body.avoidDuplicates);

    // Process the HAR file and create mock data
    await processHAR(
      harFilePath,
      path.join(process.env.MOCK_DIR, `test_${testName}`),
      `_mock_list.json`,
      testName,
      req.body.avoidDuplicates
    );

    // Update the test's mockFile array with the new mock data file
    const mockFileName = `test_${testName}/_mock_list.json`;
    testsData[testIndex].mockFile = mockFileName;

    // Save the updated tests data back to 'tests.json'
    fs.writeFileSync(testsPath, JSON.stringify(testsData, null, 2));

    // Clean up the uploaded HAR file
    fs.unlinkSync(harFilePath);

    res.status(201).json({
      message: 'HAR file processed and mock data added successfully',
      fileName: mockFileName,
    });
  } catch (error) {
    console.error('Error processing HAR file:', error);
    res
      .status(500)
      .json({ error: 'Failed to process HAR file and add mock data' });
  }
};

const updateMockDataForTest = async (req, res) => {
  const { name } = req.query;
  const updatedMockData = req.body;

  try {
    const mockFilePath = path.join(
      process.env.MOCK_DIR,
      `test_${nameToFolder(name)}`,
      `mock_${updatedMockData.id}.json`
    );
    console.log('mockFilePath', mockFilePath, updatedMockData);
    fs.writeFileSync(mockFilePath, JSON.stringify(updatedMockData, null, 2));
    res.json(updatedMockData);
  } catch (error) {
    console.error('Error updating mock data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateTestMocks = async (req, res) => {
  const testName = req.query.name;
  const updatedMocks = req.body;

  try {
    const testDir = path.join(
      process.env.MOCK_DIR,
      `test_${nameToFolder(testName)}`
    );
    const testsPath = path.join(testDir, `_mock_list.json`);
    const newMockSummary = updatedMocks.map((mock) => ({
      fileName: `mock_${mock.id}.json`,
      method: mock.method,
      path: path.join(testDir, `mock_${mock.id}.json`),
      postData: mock.request.postData,
      url: mock.url,
      id: mock.id,
    }));
    fs.writeFileSync(testsPath, JSON.stringify(newMockSummary, null, 2));

    res.status(200).json({ message: 'Test updated successfully' });
  } catch (error) {
    console.error('Error updating test:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteTestMocks = async (req, res) => {
  const testName = req.query.name;

  try {
    const testDir = path.join(
      process.env.MOCK_DIR,
      `test_${nameToFolder(testName)}`
    );
    const testsPath = path.join(testDir, `_mock_list.json`);

    // Get list of existing mock files
    const mockList = JSON.parse(fs.readFileSync(testsPath, 'utf8'));

    // Delete each mock file
    mockList.forEach((mock) => {
      const mockPath = path.join(testDir, `mock_${mock.id}.json`);
      if (fs.existsSync(mockPath)) {
        fs.unlinkSync(mockPath);
      }
    });

    // Reset mock list to empty array
    fs.writeFileSync(testsPath, JSON.stringify([], null, 2));

    res.status(200).json({ message: 'All mock data deleted successfully' });
  } catch (error) {
    console.error('Error deleting mock data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getTestsSummary = async (req, res) => {
  const indexPath = path.join(process.env.MOCK_DIR, 'tests.json');
  try {
    if (!fs.existsSync(indexPath)) {
      await fs.appendFile(indexPath, '[]', () => {
        console.log('file created successfully', indexPath);
      });
    }
    const indexData = fs.readFileSync(indexPath, 'utf8');
    const parsedData = JSON.parse(indexData || '[]');

    // Map the data to a more suitable format for the response
    const formattedData = parsedData.map((item) => ({
      id: item.id,
      name: item.name,
      mocks: util_getMockDataForTest(item.name),
    }));

    res.status(200).json(formattedData);
  } catch (error) {
    console.error('Error reading or parsing index.json:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getSnapsForTest = async (req, res) => {
  const testName = req.query.name;
  const directoryPath = path.join(
    process.env.MOCK_DIR,
    `test_${nameToFolder(testName)}`,
    '_snaps'
  );
  try {
    // Read all files in the directory
    const files = fs.readdirSync(directoryPath);

    // Map file names to their content
    const result = files.map((fileName) => {
      const filePath = path.join(directoryPath, fileName);
      const content = fs.readFileSync(filePath, 'utf8');
      return { fileName, content };
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const duplicateTest = async (req, res) => {
  const testName = req.query.name;
  const testId = req.params.id;
  const testsPath = path.join(process.env.MOCK_DIR, 'tests.json');
  const testsData = JSON.parse(fs.readFileSync(testsPath, 'utf8'));
  const testIndex = testsData.findIndex((test) => test.id === testId);
  if (testIndex === -1) {
    return res.status(404).json({ error: 'Test not found' });
  }
  const newTest = testsData[testIndex];
  newTest.id = uuidv4();
  newTest.name = `${newTest.name} (Copy)`;
  testsData.push(newTest);
  fs.writeFileSync(testsPath, JSON.stringify(testsData, null, 2));
  res.status(200).json({ message: 'Test duplicated successfully' });
};

module.exports = {
  getTests,
  deleteTest,
  updateTest,
  createTest,
  updateTestMocks,
  getMockDataForTest,
  createMockDataForTest,
  deleteMockDataForTest,
  createHarMockDataForTest,
  updateMockDataForTest,
  resetMockDataForTest,
  duplicateTest,
  getTestsSummary,
  getSnapsForTest,
  deleteTestMocks,
};
