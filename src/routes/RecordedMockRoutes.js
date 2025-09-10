const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/Logger');
const { createMockFromUserInputForTest } = require('../utils/MockGenerator');
const {
  createTest,
  getPreviousGetMocks,
  getAfterGetMocks,
} = require('../utils/TestUtils');

function getLastWordFromApiUrl(apiUrl) {
  // Split the URL into parts by '/'
  const parts = apiUrl.split('/');
  // Filter out any empty parts
  const nonEmptyParts = parts.filter(Boolean);

  // Iterate from the end of the array to find the last alphabetic-only part
  for (let i = nonEmptyParts.length - 1; i >= 0; i--) {
    if (/^[a-zA-Z]+$/.test(nonEmptyParts[i])) {
      return nonEmptyParts[i];
    }
  }

  // Return null or a default value if no alphabetic-only part is found
  return null;
}

const getRecordedMocks = async (req, res) => {
  const defaultPath = path.join(
    process.env.MOCK_DIR,
    'recordMocks',
    '_mock_list.json'
  );

  try {
    logger.info('Getting recorded mocks', { mockListPath: defaultPath });

    if (!fs.existsSync(defaultPath)) {
      logger.info('Mock list file does not exist, creating new file', {
        mockListPath: defaultPath,
      });
      await fs.appendFile(defaultPath, '[]', () => {
        logger.info('Mock list file created successfully', {
          mockListPath: defaultPath,
        });
      });
    }

    const defaultData = fs.readFileSync(defaultPath, 'utf8');
    let parsedData = JSON.parse(defaultData);

    logger.debug('Parsed mock list data', { mockCount: parsedData.length });

    // Read and attach mock data for each entry in parsedData
    parsedData = parsedData.map((entry) => {
      const mockFilePath = path.join(
        process.env.MOCK_DIR,
        'recordMocks',
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

    logger.info('Successfully retrieved recorded mocks', {
      totalMocks: parsedData.length,
      successfulLoads: parsedData.filter((entry) => entry.mockData).length,
    });

    res.status(200).json(parsedData);
  } catch (error) {
    logger.error('Error reading or parsing mock list file', {
      mockListPath: defaultPath,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteAllRecordedMocks = async (req, res) => {
  const defaultPath = path.join(process.env.MOCK_DIR, 'recordMocks');

  try {
    logger.info('Deleting all recorded mocks', {
      recordMocksPath: defaultPath,
    });

    if (!fs.existsSync(defaultPath)) {
      logger.warn('Record mocks directory does not exist', {
        recordMocksPath: defaultPath,
      });
      return res.status(200).json([]);
    }

    fs.rmSync(defaultPath, { recursive: true, force: true });
    logger.info('All recorded mocks deleted successfully', {
      recordMocksPath: defaultPath,
    });

    res.status(200).json([]);
  } catch (error) {
    logger.error('Error deleting all recorded mocks', {
      recordMocksPath: defaultPath,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteRecordedMock = async (req, res) => {
  const mockId = req.params.id;
  const defaultPath = path.join(
    process.env.MOCK_DIR,
    'recordMocks',
    '_mock_list.json'
  );

  try {
    logger.info('Deleting recorded mock', {
      mockId,
      mockListPath: defaultPath,
    });

    // Read and parse the default.json file
    let defaultData = JSON.parse(fs.readFileSync(defaultPath, 'utf8'));

    // Find the index of the mock to be deleted
    const mockIndex = defaultData.findIndex((mock) => mock.id === mockId);

    if (mockIndex === -1) {
      logger.warn('Mock not found for deletion', { mockId });
      return res.status(404).json({ error: 'Mock not found' });
    }

    const mockToDelete = defaultData[mockIndex];
    logger.debug('Found mock to delete', {
      mockId,
      mockUrl: mockToDelete.url,
      mockMethod: mockToDelete.method,
    });

    // Get the file path of the mock to be deleted
    const mockFilePath = path.join(
      process.env.MOCK_DIR,
      'recordMocks',
      `mock_${mockToDelete.id}.json`
    );

    // Remove the mock from the array
    defaultData.splice(mockIndex, 1);

    // Write the updated data back to default.json
    fs.writeFileSync(defaultPath, JSON.stringify(defaultData, null, 2));
    logger.debug('Updated mock list file', {
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

const updateRecordedMock = async (req, res) => {
  const { id } = req.params;
  const updatedMockData = req.body;

  try {
    logger.info('Updating recorded mock', {
      mockId: id,
      updateFields: Object.keys(updatedMockData),
    });

    const mockFilePath = path.join(
      process.env.MOCK_DIR,
      'recordMocks',
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

const recordMockData = async (req, res) => {
  const mockData = req.body;
  let mockDataSummary = [];

  try {
    logger.info('Recording mock data', {
      url: mockData.url,
      method: mockData.method,
      hasResponse: !!mockData.response,
    });

    mockData.id = uuidv4();
    const mockDir = path.join(process.env.MOCK_DIR, 'recordMocks');
    const mockListFilePath = path.join(mockDir, `_mock_list.json`);
    const mockFilePath = path.join(mockDir, `mock_${mockData.id}.json`);

    logger.debug('Mock recording paths', {
      mockDir,
      mockListFilePath,
      mockFilePath,
    });

    if (!fs.existsSync(mockDir)) {
      fs.mkdirSync(mockDir);
      logger.debug('Created mock directory', { mockDir });
    }

    if (!fs.existsSync(mockListFilePath)) {
      logger.info('Mock list file does not exist, creating new file', {
        mockListFilePath,
      });
      await fs.appendFile(mockListFilePath, '', () => {
        logger.info('Mock list file created successfully', {
          mockListFilePath,
        });
      });
      mockDataSummary = [];
    } else {
      mockDataSummary = JSON.parse(fs.readFileSync(mockListFilePath, 'utf8'));
      logger.debug('Loaded existing mock list', {
        mockCount: mockDataSummary.length,
      });
    }

    const mockSummary = {
      fileName: `mock_${mockData.id}.json`,
      method: mockData.method,
      url: mockData.url,
      id: mockData.id,
    };

    mockDataSummary.push(mockSummary);

    logger.debug('Added mock to summary', {
      mockId: mockData.id,
      mockUrl: mockData.url,
      mockMethod: mockData.method,
      totalMocks: mockDataSummary.length,
    });

    // Write mock data file
    fs.writeFileSync(mockFilePath, JSON.stringify(mockData, null, 2));
    logger.debug('Saved mock data file', { mockFilePath });

    // Write updated mock list
    fs.writeFileSync(
      mockListFilePath,
      JSON.stringify(mockDataSummary, null, 2)
    );
    logger.debug('Updated mock list file', { mockListFilePath });

    logger.info('Mock recorded successfully', {
      mockId: mockData.id,
      mockUrl: mockData.url,
      mockMethod: mockData.method,
      totalMocks: mockDataSummary.length,
    });

    res.json(mockData);
  } catch (error) {
    logger.error('Error recording mock data', {
      url: mockData?.url,
      method: mockData?.method,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const initiateRecordedMocks = async (req, res) => {
  const defaultPath = path.join(
    process.env.MOCK_DIR,
    'recordMocks',
    '_mock_list.json'
  );

  try {
    logger.info('Initiating recorded mocks processing', {
      mockListPath: defaultPath,
    });

    if (!fs.existsSync(defaultPath)) {
      logger.info('Mock list file does not exist, creating new file', {
        mockListPath: defaultPath,
      });
      await fs.appendFile(defaultPath, '', () => {
        logger.info('Mock list file created successfully', {
          mockListPath: defaultPath,
        });
      });
    }

    const defaultData = fs.readFileSync(defaultPath, 'utf8');
    let parsedData = JSON.parse(defaultData);

    logger.debug('Parsed mock list for processing', {
      mockCount: parsedData.length,
    });

    // Read and attach mock data for each entry in parsedData
    const mockDataList = [];
    for (let index = 0; index < parsedData.length; index++) {
      const entry = parsedData[index];
      const mockFilePath = path.join(
        process.env.MOCK_DIR,
        'recordMocks',
        `mock_${entry.id}.json`
      );
      try {
        const mockData = fs.readFileSync(mockFilePath, 'utf8');
        const parsedMockData = JSON.parse(mockData);
        mockDataList.push(parsedMockData);
        logger.debug('Loaded mock data for processing', {
          mockId: entry.id,
          mockUrl: parsedMockData.url,
          mockMethod: parsedMockData.method,
        });
      } catch (e) {
        logger.error('Error loading mock data for processing', {
          mockId: entry.id,
          mockFilePath,
          error: e.message,
        });
      }
    }

    logger.info('Processing GET mocks first', {
      getMockCount: mockDataList.filter((m) => m.method === 'GET').length,
    });

    // Process GET mocks first
    for (let index = 0; index < parsedData.length; index++) {
      try {
        const parsedMockData = mockDataList[index];
        if (parsedMockData.method === 'GET') {
          logger.debug('Processing GET mock', {
            mockId: parsedMockData.id,
            mockUrl: parsedMockData.url,
          });
          await createMockFromUserInputForTest(parsedMockData);
        }
      } catch (e) {
        logger.error('Error processing GET mock', {
          mockId: parsedMockData?.id,
          mockUrl: parsedMockData?.url,
          error: e.message,
        });
      }
    }

    logger.info('Processing non-GET mocks and creating tests', {
      nonGetMockCount: mockDataList.filter((m) => m.method !== 'GET').length,
    });

    // Process non-GET mocks and create tests
    for (let index = 0; index < parsedData.length; index++) {
      try {
        const parsedMockData = mockDataList[index];
        const lastWord = getLastWordFromApiUrl(parsedMockData.url);

        if (parsedMockData.method !== 'GET') {
          let testType = 'create';
          if (parsedMockData.method === 'POST') {
            testType = 'create';
          } else if (parsedMockData.method === 'PUT') {
            testType = 'update';
          } else if (parsedMockData.method === 'DELETE') {
            testType = 'delete';
          } else if (parsedMockData.method === 'PATCH') {
            testType = 'patch';
          } else {
            logger.debug('Skipping unsupported method', {
              mockId: parsedMockData.id,
              method: parsedMockData.method,
            });
            continue;
          }

          const testName = `${testType} ${lastWord}`;
          logger.info('Creating test for non-GET mock', {
            mockId: parsedMockData.id,
            mockUrl: parsedMockData.url,
            mockMethod: parsedMockData.method,
            testName,
            lastWord,
          });

          createTest(testName);

          // Process previous GET mocks
          const prevGetMocks = getPreviousGetMocks(mockDataList, index);
          logger.debug('Processing previous GET mocks', {
            testName,
            prevGetMockCount: prevGetMocks.length,
          });

          for (let pind = 0; pind < prevGetMocks.length; pind++) {
            await createMockFromUserInputForTest(
              prevGetMocks[pind],
              testName,
              true
            );
          }

          // Process current mock
          await createMockFromUserInputForTest(parsedMockData, testName);

          // Process after GET mocks
          const afterGetMocks = getAfterGetMocks(mockDataList, index);
          logger.debug('Processing after GET mocks', {
            testName,
            afterGetMockCount: afterGetMocks.length,
          });

          for (let pind = 0; pind < afterGetMocks.length; pind++) {
            const tempMock = Object.assign({}, afterGetMocks[pind], {
              waitForPrevious: true,
            });
            await createMockFromUserInputForTest(tempMock, testName, true);
          }

          logger.info('Test creation completed', { testName });
        }
      } catch (error) {
        logger.error('Error processing non-GET mock', {
          mockId: parsedMockData?.id,
          mockUrl: parsedMockData?.url,
          mockMethod: parsedMockData?.method,
          error: error.message,
          stack: error.stack,
        });
      }
    }

    logger.info('Recorded mocks processing completed successfully', {
      totalMocks: parsedData.length,
      processedMocks: mockDataList.length,
    });

    res.status(200).json(parsedData);
  } catch (error) {
    logger.error('Error processing recorded mocks', {
      mockListPath: defaultPath,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getRecordedMocks,
  deleteRecordedMock,
  updateRecordedMock,
  recordMockData,
  initiateRecordedMocks,
  deleteAllRecordedMocks,
};
