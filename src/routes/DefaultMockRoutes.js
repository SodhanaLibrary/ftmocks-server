const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/Logger');
const { processHAR } = require('../utils/MockGenerator');
const { nameToFolder } = require('../utils/MockUtils');

const getDefaultMocks = async (req, res) => {
  const defaultPath = path.join(
    process.env.MOCK_DIR,
    'defaultMocks',
    '_mock_list.json'
  );

  try {
    logger.info('Getting default mocks', { defaultPath });

    if (!fs.existsSync(defaultPath)) {
      logger.info('Default file does not exist, creating new file');
      await fs.appendFile(defaultPath, '[]', () => {
        logger.info('Default file created successfully');
      });
    }

    const defaultData = fs.readFileSync(defaultPath, 'utf8');
    let parsedData = JSON.parse(defaultData);

    logger.debug('Parsed default data', { mockCount: parsedData.length });

    // Read and attach mock data for each entry in parsedData
    parsedData = parsedData.map((entry) => {
      const mockFilePath = path.join(
        process.env.MOCK_DIR,
        'defaultMocks',
        `mock_${entry.id}.json`
      );
      try {
        const mockData = fs.readFileSync(mockFilePath, 'utf8');
        logger.debug('Successfully loaded mock data', {
          mockId: entry.id,
          mockFilePath,
        });
        return {
          ...entry,
          mockData: JSON.parse(mockData),
        };
      } catch (error) {
        logger.error('Error reading mock data', {
          mockId: entry.id,
          mockFilePath,
          error: error.message,
        });
        return entry; // Return the original entry if there's an error
      }
    });

    logger.info('Successfully retrieved default mocks', {
      totalMocks: parsedData.length,
      successfulLoads: parsedData.filter((entry) => entry.mockData).length,
    });

    res.status(200).json(parsedData);
  } catch (error) {
    logger.error('Error reading or parsing default mocks', {
      defaultPath,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteDefaultMock = async (req, res) => {
  const mockId = req.params.id;
  const defaultPath = path.join(
    process.env.MOCK_DIR,
    'defaultMocks',
    '_mock_list.json'
  );

  try {
    logger.info('Deleting default mock', { mockId, defaultPath });

    // Read and parse the default mocks file
    let defaultData = JSON.parse(fs.readFileSync(defaultPath, 'utf8'));

    // Find the index of the mock to be deleted
    const mockIndex = defaultData.findIndex((mock) => mock.id === mockId);

    if (mockIndex === -1) {
      logger.warn('Mock not found for deletion', { mockId });
      return res.status(404).json({ error: 'Mock not found' });
    }

    // Get the file path of the mock to be deleted
    const mockFilePath = path.join(
      process.env.MOCK_DIR,
      'defaultMocks',
      `mock_${mockId}.json`
    );

    logger.debug('Found mock to delete', {
      mockId,
      mockIndex,
      mockFilePath,
      mockUrl: defaultData[mockIndex].url,
      mockMethod: defaultData[mockIndex].method,
    });

    // Remove the mock from the array
    defaultData.splice(mockIndex, 1);

    // Write the updated data back to default mocks file
    fs.writeFileSync(defaultPath, JSON.stringify(defaultData, null, 2));
    logger.debug('Updated default mocks file', {
      remainingMocks: defaultData.length,
    });

    // Delete the associated mock file
    if (fs.existsSync(mockFilePath)) {
      fs.unlinkSync(mockFilePath);
      logger.debug('Deleted mock file', { mockFilePath });
    } else {
      logger.warn('Mock file not found for deletion', { mockFilePath });
    }

    logger.info('Mock deleted successfully', { mockId });
    res.status(200).json({ message: 'Mock deleted successfully' });
  } catch (error) {
    logger.error('Error deleting mock', {
      mockId,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateDefaultMock = async (req, res) => {
  const { id } = req.params;
  const updatedMockData = req.body;

  try {
    logger.info('Updating default mock', {
      mockId: id,
      updateFields: Object.keys(updatedMockData),
    });

    const mockFilePath = path.join(
      process.env.MOCK_DIR,
      'defaultMocks',
      `mock_${id}.json`
    );

    // Check if the mock file exists before updating
    if (!fs.existsSync(mockFilePath)) {
      logger.warn('Mock file not found for update', {
        mockId: id,
        mockFilePath,
      });
      return res.status(404).json({ error: 'Mock not found' });
    }

    // Read existing mock data for comparison
    const existingMockData = JSON.parse(fs.readFileSync(mockFilePath, 'utf8'));
    logger.debug('Existing mock data loaded', {
      mockId: id,
      existingUrl: existingMockData.url,
      existingMethod: existingMockData.method,
    });

    updatedMockData.id = id;
    fs.writeFileSync(mockFilePath, JSON.stringify(updatedMockData, null, 2));

    logger.info('Mock updated successfully', {
      mockId: id,
      newUrl: updatedMockData.url,
      newMethod: updatedMockData.method,
    });

    res.json(updatedMockData);
  } catch (error) {
    logger.error('Error updating mock data', {
      mockId: id,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const uploadDefaultHarMocs = async (req, res) => {
  if (!req.file) {
    logger.warn('No HAR file uploaded');
    return res.status(400).json({ error: 'No HAR file uploaded' });
  }

  try {
    const harFilePath = req.file.path;
    const originalName = req.file.originalname;
    const fileSize = req.file.size;

    logger.info('Processing HAR file for default mocks', {
      originalName,
      fileSize,
      harFilePath,
    });

    await processHAR(
      harFilePath,
      path.join(process.env.MOCK_DIR, 'defaultMocks'),
      '_mock_list.json'
    );

    // Clean up the uploaded file
    fs.unlinkSync(harFilePath);
    logger.debug('Cleaned up uploaded HAR file', { harFilePath });

    logger.info('HAR file processed successfully for default mocks', {
      originalName,
      processedFile: harFilePath,
    });

    res.status(200).json({ message: 'HAR file processed successfully' });
  } catch (error) {
    logger.error('Error processing HAR file for default mocks', {
      originalName: req.file?.originalname,
      fileSize: req.file?.size,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to process HAR file' });
  }
};

const moveDefaultmocks = async (req, res) => {
  try {
    logger.info('Moving default mocks to individual tests');

    const defaultPath = path.join(
      process.env.MOCK_DIR,
      'defaultMocks',
      '_mock_list.json'
    );

    if (!fs.existsSync(defaultPath)) {
      logger.warn('Default mocks file does not exist');
      return res.status(404).json({ error: 'Default mocks file not found' });
    }

    // Read default mocks
    const defaultData = JSON.parse(fs.readFileSync(defaultPath, 'utf8'));
    logger.debug('Loaded default mocks', { mockCount: defaultData.length });

    if (defaultData.length === 0) {
      logger.info('No default mocks to move');
      return res.status(200).json({ message: 'No default mocks to move' });
    }

    // Get all tests from tests.json
    const testsPath = path.join(process.env.MOCK_DIR, 'tests.json');
    let tests = [];

    if (fs.existsSync(testsPath)) {
      const testsData = fs.readFileSync(testsPath, 'utf8');
      tests = JSON.parse(testsData);
      logger.debug('Loaded tests from tests.json', { testCount: tests.length });
    } else {
      logger.warn('tests.json file does not exist');
      return res.status(404).json({ error: 'Tests file not found' });
    }

    if (tests.length === 0) {
      logger.info('No tests found to move default mocks to');
      return res.status(200).json({ message: 'No tests found' });
    }
    // Get all test directories
    const mockDir = process.env.MOCK_DIR;
    const testDirs = tests.map((test) => `test_${nameToFolder(test.name)}`);

    logger.debug('Found test directories', {
      testCount: testDirs.length,
      testDirs,
    });

    let movedCount = 0;

    // Move each default mock to all test directories
    for (const testDir of testDirs) {
      const testMockListPath = path.join(mockDir, testDir, '_mock_list.json');

      // Read existing test mock list or create empty array
      let testMockList = [];
      if (fs.existsSync(testMockListPath)) {
        testMockList = JSON.parse(fs.readFileSync(testMockListPath, 'utf8'));
      }

      // Copy each default mock to the test
      for (const defaultMock of defaultData) {
        // Generate new ID for the test mock

        // Copy mock metadata to test mock list
        testMockList.push({
          ...defaultMock,
        });

        // Copy mock data file
        const defaultMockFilePath = path.join(
          mockDir,
          'defaultMocks',
          `mock_${defaultMock.id}.json`
        );
        const testMockFilePath = path.join(
          mockDir,
          testDir,
          `mock_${defaultMock.id}.json`
        );

        if (fs.existsSync(defaultMockFilePath)) {
          const mockData = fs.readFileSync(defaultMockFilePath, 'utf8');
          fs.writeFileSync(testMockFilePath, mockData);
          movedCount++;

          logger.debug('Copied mock to test', {
            testDir,
            mockUrl: defaultMock.url,
            mockMethod: defaultMock.method,
          });
        }
      }

      // Write updated test mock list
      fs.writeFileSync(testMockListPath, JSON.stringify(testMockList, null, 2));
    }

    logger.info('Successfully moved default mocks to tests', {
      totalMoved: movedCount,
      testCount: testDirs.length,
      defaultMockCount: defaultData.length,
    });

    res.status(200).json({
      message: 'Default mocks moved successfully',
      movedCount,
      testCount: testDirs.length,
    });
  } catch (error) {
    logger.error('Error moving default mocks', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to move default mocks' });
  }
};

module.exports = {
  getDefaultMocks,
  deleteDefaultMock,
  updateDefaultMock,
  uploadDefaultHarMocs,
  moveDefaultmocks,
};
