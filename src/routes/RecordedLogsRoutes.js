const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { nameToFolder } = require('../utils/MockUtils');

const getRecordedLogs = async (req, res) => {
  const folderName = `test_${nameToFolder(req.query.name)}`;
  const defaultPath = path.join(process.env.MOCK_DIR, folderName, '_logs.json');

  try {
    let parsedData = [];
    if (fs.existsSync(defaultPath)) {
      const defaultData = fs.readFileSync(defaultPath, 'utf8');
      parsedData = JSON.parse(defaultData);
    }

    res.status(200).json(parsedData);
  } catch (error) {
    console.error(`Error reading or parsing default.json:`, error);
    res.status(200).json([]);
  }
};

const deleteAllLogs = async (req, res) => {
  const folderName = `test_${nameToFolder(req.params.name)}`;
  const defaultPath = path.join(process.env.MOCK_DIR, folderName, '_logs.json');
  try {
    fs.rmSync(defaultPath, { recursive: true, force: true });
    res.status(200).json([]);
  } catch (error) {
    console.error(`Error reading or parsing default.json:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteRecordedLog = async (req, res) => {
  const folderName = `test_${nameToFolder(req.params.name)}`;
  const mockId = req.params.id;
  const defaultPath = path.join(process.env.MOCK_DIR, folderName, '_logs.json');

  try {
    // Read and parse the default.json file
    let defaultData = JSON.parse(fs.readFileSync(defaultPath, 'utf8'));

    // Find the index of the mock to be deleted
    const mockIndex = defaultData.findIndex((mock) => mock.id === mockId);

    if (mockIndex === -1) {
      return res.status(404).json({ error: 'Log not found' });
    }
    // Remove the mock from the array
    defaultData.splice(mockIndex, 1);

    // Write the updated data back to default.json
    fs.writeFileSync(defaultPath, JSON.stringify(defaultData, null, 2));

    res.status(200).json({ message: 'Log deleted successfully' });
  } catch (error) {
    console.error('Error deleting log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const recordLogData = async (req, res) => {
  const folderName = `test_${nameToFolder(req.params.name)}`;
  const mockData = req.body;
  let mockDataSummary = [];

  try {
    mockData.id = uuidv4();
    const mockDir = path.join(process.env.MOCK_DIR, folderName);
    const mockLogsFilePath = path.join(mockDir, `_logs.json`);
    if (!fs.existsSync(mockDir)) {
      fs.mkdirSync(mockDir);
    }
    if (!fs.existsSync(mockLogsFilePath)) {
      await fs.appendFile(mockLogsFilePath, '', () => {
        console.log('list file created successfully');
      });
      mockDataSummary = [];
    } else {
      mockDataSummary = JSON.parse(fs.readFileSync(mockLogsFilePath, 'utf8'));
    }

    mockDataSummary.push({
      id: mockData.id,
      type: mockData.type,
      target: mockData.target,
      time: mockData.time,
    });
    fs.writeFileSync(
      mockLogsFilePath,
      JSON.stringify(mockDataSummary, null, 2)
    );
    res.json(mockData);
  } catch (error) {
    console.error('Error updating mock data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getRecordedLogs,
  deleteRecordedLog,
  recordLogData,
  deleteAllLogs,
};
