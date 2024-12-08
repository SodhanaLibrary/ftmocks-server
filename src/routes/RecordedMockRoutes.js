const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { createMockFromUserInputForTest } = require('../utils/MockGenerator');
const { createTest } = require('../utils/TestUtils');

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
    if (!fs.existsSync(defaultPath)) {
      await fs.appendFile(defaultPath, '[]', () => {
        console.log('default file created successfully');
      });
    }
    const defaultData = fs.readFileSync(defaultPath, 'utf8');
    let parsedData = JSON.parse(defaultData);

    // Read and attach mock data for each entry in parsedData
    parsedData = parsedData.map((entry) => {
      const mockFilePath = entry.path;
      try {
        const mockData = fs.readFileSync(mockFilePath, 'utf8');
        return {
          ...entry,
          mockData: JSON.parse(mockData),
        };
      } catch (error) {
        console.error(`Error reading mock data for ${entry.path}:`, error);
        return entry; // Return the original entry if there's an error
      }
    });
    res.status(200).json(parsedData);
  } catch (error) {
    console.error(`Error reading or parsing default.json:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteAllRecordedMocks = async (req, res) => {
  const defaultPath = path.join(process.env.MOCK_DIR, 'recordMocks');

  try {
    fs.rmSync(defaultPath, { recursive: true, force: true });
    res.status(200).json([]);
  } catch (error) {
    console.error(`Error reading or parsing default.json:`, error);
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
    // Read and parse the default.json file
    let defaultData = JSON.parse(fs.readFileSync(defaultPath, 'utf8'));

    // Find the index of the mock to be deleted
    const mockIndex = defaultData.findIndex((mock) => mock.id === mockId);

    if (mockIndex === -1) {
      return res.status(404).json({ error: 'Mock not found' });
    }

    // Get the file path of the mock to be deleted
    const mockFilePath = defaultData[mockIndex].path;

    // Remove the mock from the array
    defaultData.splice(mockIndex, 1);

    // Write the updated data back to default.json
    fs.writeFileSync(defaultPath, JSON.stringify(defaultData, null, 2));

    // Delete the associated mock file
    fs.unlinkSync(mockFilePath);

    res.status(200).json({ message: 'Mock deleted successfully' });
  } catch (error) {
    console.error('Error deleting mock:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateRecordedMock = async (req, res) => {
  const { id } = req.params;
  const updatedMockData = req.body;

  try {
    const mockFilePath = path.join(
      process.env.MOCK_DIR,
      'recordMocks',
      `mock_${id}.json`
    );
    updatedMockData.id = id;
    fs.writeFileSync(mockFilePath, JSON.stringify(updatedMockData, null, 2));
    res.json(updatedMockData);
  } catch (error) {
    console.error('Error updating mock data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const recordMockData = async (req, res) => {
  const mockData = req.body;
  let mockDataSummary = [];

  try {
    mockData.id = uuidv4();
    const mockDir = path.join(process.env.MOCK_DIR, 'recordMocks');
    const mockListFilePath = path.join(mockDir, `_mock_list.json`);
    const mockFilePath = path.join(mockDir, `mock_${mockData.id}.json`);
    if (!fs.existsSync(mockDir)) {
      fs.mkdirSync(mockDir);
    }
    if (!fs.existsSync(mockListFilePath)) {
      await fs.appendFile(mockListFilePath, '', () => {
        console.log('list file created successfully');
      });
      mockDataSummary = [];
    } else {
      mockDataSummary = JSON.parse(fs.readFileSync(mockListFilePath, 'utf8'));
    }
    if(mockDataSummary.length >= process.env.MOCK_RECORDER_LIMIT) {
      throw 'MOCK_RECORDER_LIMIT reached'
    } else {
      mockDataSummary.push({
        fileName: `mock_${mockData.id}.json`,
        method: mockData.method,
        path: mockFilePath,
        url: mockData.url,
        id: mockData.id,
      });
      fs.writeFileSync(mockFilePath, JSON.stringify(mockData, null, 2));
      fs.writeFileSync(
        mockListFilePath,
        JSON.stringify(mockDataSummary, null, 2)
      );
      res.json(mockData);
    }
  } catch (error) {
    console.error('Error updating mock data:', error);
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
    if (!fs.existsSync(defaultPath)) {
      await fs.appendFile(defaultPath, '', () => {
        console.log('default file created successfully');
      });
    }
    const defaultData = fs.readFileSync(defaultPath, 'utf8');
    let parsedData = JSON.parse(defaultData);

    // Read and attach mock data for each entry in parsedData
    parsedData.forEach((entry) => {
      const mockFilePath = entry.path;
      try {
        const mockData = fs.readFileSync(mockFilePath, 'utf8');
        const parsedMockData = JSON.parse(mockData);
        const lastWord = getLastWordFromApiUrl(parsedMockData.url);
        if(parsedMockData.method === 'GET') {
          createMockFromUserInputForTest(parsedMockData);
        } else {
          let testType = 'create';
          if (parsedMockData.method === 'PUT') {
            testType = 'update';
          } else if (parsedMockData.method === 'DELETE') {
            testType = 'delete';
          } else if (parsedMockData.method === 'PATCH') {
            testType = 'patch';
          }
          createTest(`${testType} ${lastWord}`);
          createMockFromUserInputForTest(JSON.parse(mockData), `${testType} ${lastWord}`);
        }
      } catch (error) {
        console.error(`Error reading mock data for ${entry.path}:`, error);
        return entry; // Return the original entry if there's an error
      }
    });

    res.status(200).json(parsedData);
  } catch (error) {
    console.error(`Error reading or parsing default.json:`, error);
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
