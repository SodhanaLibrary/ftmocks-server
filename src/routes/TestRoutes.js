const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const logger = require('../utils/Logger');
const {
  processHAR,
  createMockFromUserInputForTest,
} = require('../utils/MockGenerator');
const { nameToFolder } = require('../utils/MockUtils');

const getTests = async (req, res) => {
  const indexPath = path.join(process.env.MOCK_DIR, 'tests.json');
  try {
    logger.info('Getting tests', { testsPath: indexPath });

    if (!fs.existsSync(indexPath)) {
      logger.info('Tests file does not exist, creating new file', {
        testsPath: indexPath,
      });
      await fs.writeFileSync(indexPath, '[]', () => {
        logger.info('Tests file created successfully', {
          testsPath: indexPath,
        });
      });
    }

    const indexData = fs.readFileSync(indexPath, 'utf8');
    const parsedData = JSON.parse(indexData || '[]');

    logger.debug('Parsed tests data', { testCount: parsedData.length });

    // Map the data to a more suitable format for the response
    logger.info('Successfully retrieved tests', {
      testCount: parsedData.length,
      testNames: parsedData.map((t) => t.name),
    });

    res.status(200).json(parsedData);
  } catch (error) {
    logger.error('Error reading or parsing tests file', {
      testsPath: indexPath,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteTest = async (req, res) => {
  const testId = req.params.id;
  const testName = req.query.name;
  const testsPath = path.join(process.env.MOCK_DIR, 'tests.json');

  try {
    logger.info('Deleting test', { testId, testName, testsPath });

    let testsData = fs.readFileSync(testsPath, 'utf8');
    let tests = JSON.parse(testsData);

    const testIndex = tests.findIndex((test) => test.id === testId);

    if (testIndex === -1) {
      logger.warn('Test not found for deletion', { testId, testName });
      return res.status(404).json({ error: 'Test not found' });
    }

    const testToDelete = tests[testIndex];
    logger.debug('Found test to delete', {
      testId,
      testName: testToDelete.name,
    });

    const folderPath = path.join(
      process.env.MOCK_DIR,
      `test_${nameToFolder(testName)}`
    );

    if (fs.existsSync(folderPath)) {
      fs.rmSync(folderPath, { recursive: true });
      logger.debug('Deleted test folder', { folderPath });
    } else {
      logger.warn('Test folder not found for deletion', { folderPath });
    }

    tests.splice(testIndex, 1);
    fs.writeFileSync(testsPath, JSON.stringify(tests, null, 2));

    logger.info('Test deleted successfully', {
      testId,
      testName,
      remainingTests: tests.length,
    });

    res.status(200).json({ message: 'Test deleted successfully' });
  } catch (error) {
    logger.error('Error deleting test', {
      testId,
      testName,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createTest = async (req, res) => {
  const testsPath = path.join(process.env.MOCK_DIR, 'tests.json');
  let tests = [];

  try {
    logger.info('Creating new test', {
      testName: req.body.name,
      testsPath,
    });

    // Read existing tests
    const testsData = fs.readFileSync(testsPath, 'utf8');
    tests = JSON.parse(testsData);

    const etest = tests.find((tst) => tst.name === req.body.name);
    if (!etest) {
      const newTest = {
        id: uuidv4(),
        name: req.body.name,
        type: req.body.type,
        parentId: req.body.parentId,
      };

      if (req.body.type !== 'folder') {
        tests.push(newTest);
        const folderPath = path.join(
          process.env.MOCK_DIR,
          `test_${nameToFolder(req.body.name)}`
        );

        const mockListFilePath = path.join(folderPath, '_mock_list.json');

        logger.debug('Creating test directory and files', {
          folderPath,
          mockListFilePath,
        });

        fs.mkdirSync(folderPath, { recursive: true }, (err) => {
          if (err) {
            logger.error('Error creating directory', {
              folderPath,
              error: err.message,
            });
          } else {
            logger.debug('Directory created successfully', { folderPath });
          }
        });

        await fs.writeFileSync(mockListFilePath, '[]', () => {
          logger.debug('Mock list file created successfully', {
            mockListFilePath,
          });
        });

        logger.info('New test created successfully', {
          testId: newTest.id,
          testName: newTest.name,
          folderPath,
        });
      } else {
        tests.unshift(newTest);
        logger.info('New folder created successfully', {
          testId: newTest.id,
          testName: newTest.name,
        });
      }
      fs.writeFileSync(testsPath, JSON.stringify(tests, null, 2));

      res.status(201).json({
        message: `New ${req.body.type} created successfully`,
        test: newTest,
      });
      return;
    } else {
      logger.warn(`${req.body.type} already exists`, {
        testName: req.body.name,
      });
      throw `${req.body.type} already exists`;
    }
  } catch (error) {
    logger.error('Error creating test', {
      testName: req.body?.name,
      testType: req.body?.type,
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ error: `Error creating ${req.body.type}` });
  }
};

const updateTest = async (req, res) => {
  const testId = req.params.id;
  const updatedTest = req.body;

  try {
    logger.info(
      'Updating test',
      {
        testId,
        newTestName: updatedTest.name,
        mode: updatedTest.mode,
        testsPath: path.join(process.env.MOCK_DIR, 'tests.json'),
      },
      true
    );

    const testsPath = path.join(process.env.MOCK_DIR, 'tests.json');
    let testsData = JSON.parse(fs.readFileSync(testsPath, 'utf8'));

    const testIndex = testsData.findIndex((test) => test.id === testId);
    if (testIndex === -1) {
      logger.warn('Test not found for update', { testId });
      return res.status(404).json({ error: 'Test not found' });
    }

    const originalTest = testsData[testIndex];
    logger.debug(
      'Found test to update',
      {
        testId,
        originalName: originalTest.name,
        originalMode: originalTest.mode,
        newName: updatedTest.name,
        mode: updatedTest.mode,
      },
      true
    );

    if (
      originalTest.name !== updatedTest.name &&
      originalTest.type !== 'folder'
    ) {
      const testFolder = path.join(
        process.env.MOCK_DIR,
        `test_${nameToFolder(originalTest.name)}`
      );

      if (fs.existsSync(testFolder)) {
        const newTestFolder = path.join(
          process.env.MOCK_DIR,
          `test_${nameToFolder(updatedTest.name)}`
        );

        fs.renameSync(testFolder, newTestFolder, (err) => {
          if (err) {
            logger.error('Error renaming test folder', {
              oldPath: testFolder,
              newPath: newTestFolder,
              error: err.message,
            });
            throw err;
          }
        });

        logger.debug('Test folder renamed successfully', {
          oldPath: testFolder,
          newPath: newTestFolder,
        });
      }
    }
    testsData[testIndex].name = updatedTest.name;
    testsData[testIndex].mode = updatedTest.mode;
    testsData[testIndex].parentId = updatedTest.parentId;
    testsData[testIndex].mockFile =
      `test_${nameToFolder(updatedTest.name)}/_mock_list.json`;

    fs.writeFileSync(testsPath, JSON.stringify(testsData, null, 2));

    logger.info('Test updated successfully', {
      testId,
      originalName: originalTest.name,
      newName: updatedTest.name,
    });

    res.status(200).json({ message: 'Test updated successfully' });
  } catch (error) {
    logger.error('Error updating test', {
      testId,
      newTestName: updatedTest?.name,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const util_getMockDataForTest = (testName) => {
  const testDataPath = path.join(
    process.env.MOCK_DIR,
    `test_${nameToFolder(testName)}`,
    '_mock_list.json'
  );

  logger.debug('Getting mock data for test', { testName, testDataPath });

  // Read the mock data from the test-specific file
  let mockData = [];
  if (fs.existsSync(testDataPath)) {
    mockData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));
    logger.debug('Loaded mock list', { testName, mockCount: mockData.length });
  } else {
    logger.warn('Mock list file not found', { testName, testDataPath });
  }

  // Read data from path attribute file names and assign as mockData
  const updatedMockData = mockData.map((item) => {
    try {
      const mockFilePath = path.join(
        process.env.MOCK_DIR,
        `test_${nameToFolder(testName)}`,
        `mock_${item.id}.json`
      );

      const fileContent = fs.readFileSync(mockFilePath, 'utf8');
      const parsedContent = JSON.parse(fileContent);

      logger.debug('Successfully loaded mock file', {
        testName,
        mockId: item.id,
        mockFilePath,
      });

      return parsedContent;
    } catch (error) {
      logger.error('Error reading mock file', {
        testName,
        mockId: item.id,
        error: error.message,
      });
      return item; // Return the original item if there's an error
    }
  });

  logger.debug('Mock data processing completed', {
    testName,
    totalMocks: updatedMockData.length,
    successfulLoads: updatedMockData.filter((m) => m.id).length,
  });

  return updatedMockData;
};

const getMockDataForTest = async (req, res) => {
  const testName = req.query.name;

  try {
    logger.info('Getting mock data for test', { testName });

    const updatedMockData = util_getMockDataForTest(testName);

    logger.info('Successfully retrieved mock data for test', {
      testName,
      mockCount: updatedMockData.length,
    });

    res.status(200).json(updatedMockData);
  } catch (error) {
    logger.error('Error reading mock data', {
      testName,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to retrieve mock data' });
  }
};

const createMockDataForTest = async (req, res) => {
  const testName = req.query.name;
  const mockData = req.body;

  try {
    logger.info('Creating mock data for test', {
      testName,
      mockUrl: mockData.url,
      mockMethod: mockData.method,
    });

    createMockFromUserInputForTest(mockData, testName);

    logger.info('Mock data created successfully', {
      testName,
      mockUrl: mockData.url,
      mockMethod: mockData.method,
    });

    res.status(200).json({ message: 'Uploaded successfully' });
  } catch (error) {
    logger.error('Error adding mock data', {
      testName,
      mockUrl: mockData?.url,
      mockMethod: mockData?.method,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to add mock data' });
  }
};

const deleteMockDataForTest = async (req, res) => {
  const testId = req.params.id;
  const mockId = req.params.mockId;
  const testName = req.query.name;

  try {
    logger.info('Deleting mock data for test', {
      testId,
      mockId,
      testName,
    });

    const tetFilePath = path.join(
      process.env.MOCK_DIR,
      `test_${nameToFolder(testName)}`,
      `_mock_list.json`
    );

    // Read and parse the mock data file
    let mockData = JSON.parse(fs.readFileSync(tetFilePath, 'utf8'));

    logger.debug('Loaded mock list for deletion', {
      testName,
      totalMocks: mockData.length,
      targetMockId: mockId,
    });

    // Remove the mock record with the given mockId
    const originalCount = mockData.length;
    mockData = mockData.filter((mock) => mock.id !== mockId);
    const removedCount = originalCount - mockData.length;

    if (removedCount === 0) {
      logger.warn('Mock not found in list for deletion', {
        testName,
        mockId,
      });
    }

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
      const mockFileContent = fs.readFileSync(mockFilePath, 'utf8');
      const mockFileData = JSON.parse(mockFileContent);
      if (mockFileData.response.file) {
        const filePath = path.join(
          process.env.MOCK_DIR,
          `test_${nameToFolder(testName)}`,
          '_files',
          mockFileData.response.file
        );
        fs.unlinkSync(filePath);
        logger.debug('Deleted file', { filePath });
      }
      fs.unlinkSync(mockFilePath);
      logger.debug('Deleted mock file', { mockFilePath });
    } else {
      logger.warn('Mock file not found for deletion', { mockFilePath }, true);
    }

    logger.info('Mock data deleted successfully', {
      testName,
      mockId,
      remainingMocks: mockData.length,
    });

    res.status(200).json({ message: 'Mock data deleted successfully' });
  } catch (error) {
    logger.error(
      'Error deleting mock data',
      {
        testId,
        mockId,
        testName,
        error: error.message,
        stack: error.stack,
      },
      true
    );
    res.status(500).json({ error: 'Failed to delete mock data' });
  }
};

const resetMockDataForTest = async (req, res) => {
  const currentTest = req.body;

  try {
    logger.info('Resetting mock data for test', {
      testName: currentTest.name,
      mockCount: currentTest.mockData.length,
    });

    currentTest.mockData.forEach((mockData) => {
      const mockFilePath = path.join(
        process.env.MOCK_DIR,
        `test_${nameToFolder(currentTest.name)}`,
        `mock_${mockData.id}.json`
      );

      mockData.served = false;
      fs.writeFileSync(mockFilePath, JSON.stringify(mockData, null, 2));

      logger.debug('Reset mock served status', {
        testName: currentTest.name,
        mockId: mockData.id,
        mockUrl: mockData.url,
      });
    });

    logger.info('Mock data reset completed', {
      testName: currentTest.name,
      resetMocks: currentTest.mockData.length,
    });

    res.json(currentTest);
  } catch (error) {
    logger.error('Error updating mock data', {
      testName: currentTest?.name,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createHarMockDataForTest = async (req, res) => {
  const testId = req.params.id;
  const testsPath = path.join(process.env.MOCK_DIR, 'tests.json');

  if (!req.file) {
    logger.warn('No HAR file uploaded');
    return res.status(400).json({ error: 'No HAR file uploaded' });
  }

  try {
    logger.info('Processing HAR file for test', {
      testId,
      harFileName: req.file.originalname,
      harFileSize: req.file.size,
      avoidDuplicates: req.body.avoidDuplicates,
    });

    // Read and parse the 'tests.json' file
    const testsData = JSON.parse(fs.readFileSync(testsPath, 'utf8'));

    // Find the test with the given id
    const testIndex = testsData.findIndex((test) => test.id === testId);

    if (testIndex === -1) {
      logger.warn('Test not found for HAR processing', { testId });
      return res.status(404).json({ error: 'Test not found' });
    }

    const harFilePath = req.file.path;
    const testName = nameToFolder(req.body.testName);

    logger.debug('HAR processing parameters', {
      testId,
      testName,
      harFilePath,
      avoidDuplicates: req.body.avoidDuplicates,
    });

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
    logger.debug('Cleaned up uploaded HAR file', { harFilePath });

    logger.info('HAR file processed successfully', {
      testId,
      testName,
      mockFileName,
    });

    res.status(201).json({
      message: 'HAR file processed and mock data added successfully',
      fileName: mockFileName,
    });
  } catch (error) {
    logger.error('Error processing HAR file', {
      testId,
      harFileName: req.file?.originalname,
      error: error.message,
      stack: error.stack,
    });
    res
      .status(500)
      .json({ error: 'Failed to process HAR file and add mock data' });
  }
};

const updateMockDataForTest = async (req, res) => {
  const { name } = req.query;
  const updatedMockData = req.body;

  try {
    logger.info('Updating mock data for test', {
      testName: name,
      mockId: updatedMockData.id,
      mockUrl: updatedMockData.url,
    });

    const mockFilePath = path.join(
      process.env.MOCK_DIR,
      `test_${nameToFolder(name)}`,
      `mock_${updatedMockData.id}.json`
    );

    logger.debug('Mock file path', { mockFilePath });

    fs.writeFileSync(mockFilePath, JSON.stringify(updatedMockData, null, 2));

    logger.info('Mock data updated successfully', {
      testName: name,
      mockId: updatedMockData.id,
    });

    res.json(updatedMockData);
  } catch (error) {
    logger.error('Error updating mock data', {
      testName: name,
      mockId: updatedMockData?.id,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateTestMocks = async (req, res) => {
  const testName = req.query.name;
  const updatedMocks = req.body;

  try {
    logger.info('Updating test mocks', {
      testName,
      mockCount: updatedMocks.length,
    });

    const testDir = path.join(
      process.env.MOCK_DIR,
      `test_${nameToFolder(testName)}`
    );
    const testsPath = path.join(testDir, `_mock_list.json`);

    const newMockSummary = updatedMocks.map((mock) => ({
      fileName: `mock_${mock.id}.json`,
      method: mock.method,
      postData: mock.request.postData,
      url: mock.url,
      id: mock.id,
    }));

    logger.debug('Created new mock summary', {
      testName,
      summaryCount: newMockSummary.length,
    });

    fs.writeFileSync(testsPath, JSON.stringify(newMockSummary, null, 2));

    logger.info('Test mocks updated successfully', {
      testName,
      updatedMocks: newMockSummary.length,
    });

    res.status(200).json({ message: 'Test updated successfully' });
  } catch (error) {
    logger.error('Error updating test mocks', {
      testName,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteTestMocks = async (req, res) => {
  const testName = req.query.name;

  try {
    logger.info('Deleting all test mocks', { testName });

    const testDir = path.join(
      process.env.MOCK_DIR,
      `test_${nameToFolder(testName)}`
    );
    const testsPath = path.join(testDir, `_mock_list.json`);

    // Get list of existing mock files
    const mockList = JSON.parse(fs.readFileSync(testsPath, 'utf8'));

    logger.debug('Found mocks to delete', {
      testName,
      mockCount: mockList.length,
    });

    // Delete each mock file
    let deletedCount = 0;
    mockList.forEach((mock) => {
      const mockPath = path.join(testDir, `mock_${mock.id}.json`);
      if (fs.existsSync(mockPath)) {
        fs.unlinkSync(mockPath);
        deletedCount++;
        logger.debug('Deleted mock file', { mockPath });
      } else {
        logger.warn('Mock file not found for deletion', { mockPath });
      }
    });

    // Delete _files directory if it exists
    const filesDir = path.join(testDir, '_files');
    if (fs.existsSync(filesDir)) {
      fs.rmSync(filesDir, { recursive: true, force: true });
      logger.debug('Deleted _files directory', { filesDir });
    }

    // Reset mock list to empty array
    fs.writeFileSync(testsPath, JSON.stringify([], null, 2));

    logger.info('All test mocks deleted successfully', {
      testName,
      totalMocks: mockList.length,
      deletedMocks: deletedCount,
    });

    res.status(200).json({ message: 'All mock data deleted successfully' });
  } catch (error) {
    logger.error('Error deleting test mocks', {
      testName,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getTestsSummary = async (req, res) => {
  const indexPath = path.join(process.env.MOCK_DIR, 'tests.json');

  try {
    logger.info('Getting tests summary');

    if (!fs.existsSync(indexPath)) {
      logger.info('Tests file does not exist, creating new file', {
        testsPath: indexPath,
      });
      await fs.writeFileSync(indexPath, '[]', () => {
        logger.info('Tests file created successfully', {
          testsPath: indexPath,
        });
      });
    }

    const indexData = fs.readFileSync(indexPath, 'utf8');
    const parsedData = JSON.parse(indexData || '[]');

    logger.debug('Parsed tests data for summary', {
      testCount: parsedData.length,
    });

    // Map the data to a more suitable format for the response
    const formattedData = parsedData.map((item) => ({
      id: item.id,
      name: item.name,
      mocks: util_getMockDataForTest(item.name),
      mode: item.mode,
    }));

    logger.info('Successfully retrieved tests summary', {
      testCount: formattedData.length,
      totalMocks: formattedData.reduce(
        (sum, test) => sum + test.mocks.length,
        0
      ),
    });

    res.status(200).json(formattedData);
  } catch (error) {
    logger.error('Error reading or parsing tests summary', {
      testsPath: indexPath,
      error: error.message,
      stack: error.stack,
    });
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
    logger.info('Getting snaps for test', {
      testName,
      snapsPath: directoryPath,
    });

    if (!fs.existsSync(directoryPath)) {
      logger.warn('Snaps directory not found', {
        testName,
        snapsPath: directoryPath,
      });
      return res.status(200).json([]);
    }

    // Read all files in the directory
    const files = fs.readdirSync(directoryPath);

    logger.debug('Found snap files', { testName, fileCount: files.length });

    // Map file names to their content
    const result = files.map((fileName) => {
      const filePath = path.join(directoryPath, fileName);
      const content = fs.readFileSync(filePath, 'utf8');
      return { fileName, content };
    });

    logger.info('Successfully retrieved snaps for test', {
      testName,
      snapCount: result.length,
    });

    res.status(200).json(result);
  } catch (error) {
    logger.error('Error getting snaps for test', {
      testName,
      snapsPath: directoryPath,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const duplicateTest = async (req, res) => {
  const testName = req.query.name;
  const testId = req.params.id;
  const testsPath = path.join(process.env.MOCK_DIR, 'tests.json');

  try {
    logger.info('Duplicating test', { testId, testName });

    const testsData = JSON.parse(fs.readFileSync(testsPath, 'utf8'));
    const testIndex = testsData.findIndex((test) => test.id === testId);

    if (testIndex === -1) {
      logger.warn('Test not found for duplication', { testId, testName });
      return res.status(404).json({ error: 'Test not found' });
    }

    const originalTest = testsData[testIndex];
    const newTest = { ...originalTest };
    newTest.id = uuidv4();
    newTest.name = `${newTest.name} (Copy)`;

    logger.debug('Created test copy', {
      originalId: originalTest.id,
      newId: newTest.id,
      originalName: originalTest.name,
      newName: newTest.name,
    });

    testsData.push(newTest);
    fs.writeFileSync(testsPath, JSON.stringify(testsData, null, 2));

    // Create new directory for the duplicated test
    const newTestDir = path.join(
      process.env.MOCK_DIR,
      `test_${nameToFolder(newTest.name)}`
    );
    if (!fs.existsSync(newTestDir)) {
      fs.mkdirSync(newTestDir, { recursive: true });
      logger.debug('Created new test directory', { directory: newTestDir });
    }
    // Copy files from original test directory to new test directory
    const originalTestDir = path.join(
      process.env.MOCK_DIR,
      `test_${nameToFolder(testName)}`
    );
    if (fs.existsSync(originalTestDir)) {
      const files = fs.readdirSync(originalTestDir);
      files.forEach((file) => {
        const sourcePath = path.join(originalTestDir, file);
        const destPath = path.join(newTestDir, file);
        try {
          fs.copyFileSync(sourcePath, destPath);
          logger.debug('Copied test file', {
            from: sourcePath,
            to: destPath,
          });
        } catch (e) {
          logger.error('Unable to copy file', { sourcePath, destPath });
        }
      });
    }

    logger.info('Test duplicated successfully', {
      originalId: originalTest.id,
      newId: newTest.id,
      originalName: originalTest.name,
      newName: newTest.name,
    });

    res.status(200).json({ message: 'Test duplicated successfully' });
  } catch (error) {
    logger.error('Error duplicating test', {
      testId,
      testName,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const moveMockToDefaultMocks = async (req, res) => {
  const mockIds = req.body.mockIds;
  const testName = req.body.testName;
  try {
    logger.info('Moving mock to default mocks', { mockIds, testName });

    const defaultMockListFilePath = path.join(
      process.env.MOCK_DIR,
      'defaultMocks',
      '_mock_list.json'
    );

    if (!fs.existsSync(defaultMockListFilePath)) {
      logger.warn('Default mocks file does not exist', {
        defaultMockListFilePath,
      });
      return res.status(404).json({ error: 'Default mocks file not found' });
    }

    // Read default mocks
    let defaultMockList = JSON.parse(
      fs.readFileSync(defaultMockListFilePath, 'utf8')
    );
    logger.debug('Loaded default mocks', { mockCount: defaultMockList.length });

    const testMockListPath = path.join(
      process.env.MOCK_DIR,
      `test_${nameToFolder(testName)}`,
      '_mock_list.json'
    );

    // Read existing test mock list or create empty array
    let testMockList = [];
    if (fs.existsSync(testMockListPath)) {
      testMockList = JSON.parse(fs.readFileSync(testMockListPath, 'utf8'));
    }

    // Copy each default mock to the test
    for (const mockId of mockIds) {
      const defaultMockFilePath = path.join(
        process.env.MOCK_DIR,
        'defaultMocks',
        `mock_${mockId}.json`
      );
      const testMockFilePath = path.join(
        process.env.MOCK_DIR,
        `test_${nameToFolder(testName)}`,
        `mock_${mockId}.json`
      );

      if (fs.existsSync(testMockFilePath)) {
        const mockData = fs.readFileSync(testMockFilePath, 'utf8');
        const parsedMockData = JSON.parse(mockData);
        if (parsedMockData.response.file) {
          const filePath = path.join(
            process.env.MOCK_DIR,
            `test_${nameToFolder(testName)}`,
            '_files',
            parsedMockData.response.file
          );
          if (fs.existsSync(filePath)) {
            const defaultFilesPath = path.join(
              process.env.MOCK_DIR,
              'defaultMocks',
              '_files'
            );
            if (!fs.existsSync(defaultFilesPath)) {
              fs.mkdirSync(defaultFilesPath, { recursive: true });
            }
            fs.copyFileSync(
              filePath,
              path.join(defaultFilesPath, parsedMockData.response.file)
            );
          } else {
            logger.warn('File not found for copying', { filePath });
          }
        } else {
          logger.warn('File not found for copying', {
            filePath: testMockFilePath,
          });
        }
        fs.writeFileSync(defaultMockFilePath, mockData);
        defaultMockList.push({
          id: parsedMockData.id,
          url: parsedMockData.url,
          method: parsedMockData.method,
          time: parsedMockData.time,
        });
        fs.writeFileSync(
          defaultMockListFilePath,
          JSON.stringify(defaultMockList, null, 2)
        );
        logger.debug('Copied mock to default mocks', { testName, mockId });
      }
    }

    res.status(200).json({
      message: 'Mock moved to default mocks successfully',
    });
  } catch (error) {
    logger.error('Error moving mock to default mocks', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to move mock to default mocks' });
  }
};

/**
 * Re-order tests in tests.json by given array of test IDs (newOrder).
 * Expects JSON body: { newOrder: [...] }
 */
const reorderTests = (req, res) => {
  const testsPath = path.join(process.env.MOCK_DIR, 'tests.json');
  let tests = [];
  try {
    logger.info('Reordering tests', {
      newOrder: req.body.newOrder,
    });

    const { newOrder } = req.body;
    if (!Array.isArray(newOrder)) {
      return res.status(400).json({ error: 'Invalid newOrder array' });
    }

    const testsData = fs.readFileSync(testsPath, 'utf8');
    tests = JSON.parse(testsData);

    // Create map for quick lookup
    const testMap = {};
    tests.forEach((t) => {
      testMap[t.id] = t;
    });

    // Rebuild tests array in the new order
    const reorderedTests = [];
    newOrder.forEach((id) => {
      if (testMap[id]) {
        reorderedTests.push(testMap[id]);
      }
    });

    // Optionally, append any remaining tests not in newOrder, to be safe
    tests.forEach((t) => {
      if (!newOrder.includes(t.id)) {
        reorderedTests.push(t);
      }
    });

    fs.writeFileSync(testsPath, JSON.stringify(reorderedTests, null, 2));

    logger.info('Tests reordered successfully', {
      newOrder,
    });

    res.status(200).json({ message: 'Tests reordered successfully' });
  } catch (error) {
    logger.error('Error reordering tests', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to reorder tests' });
  }
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
  moveMockToDefaultMocks,
  reorderTests,
};
