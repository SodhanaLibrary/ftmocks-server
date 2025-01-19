const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const getRecordedEvents = async (req, res) => {
  const defaultPath = path.join(
    process.env.MOCK_DIR,
    'recordMocks',
    '_events.json'
  );

  try {
    if (!fs.existsSync(defaultPath)) {
      await fs.appendFile(defaultPath, '[]', () => {
        console.log('default file created successfully');
      });
    }
    const defaultData = fs.readFileSync(defaultPath, 'utf8');
    let parsedData = JSON.parse(defaultData);
    
    res.status(200).json(parsedData);
  } catch (error) {
    console.error(`Error reading or parsing default.json:`, error);
    res.status(200).json([]);
  }
};

const deleteAllEvents = async (req, res) => {
  const defaultPath = path.join(
    process.env.MOCK_DIR,
    'recordMocks',
    '_events.json'
  );
  const snapsPath = path.join(
    process.env.MOCK_DIR,
    'recordMocks',
    '_snaps'
  );

  try {
    fs.rmSync(snapsPath, { recursive: true, force: true });
    fs.rmSync(defaultPath, { recursive: true, force: true });
    res.status(200).json([]);
  } catch (error) {
    console.error(`Error reading or parsing default.json:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteRecordedEvent = async (req, res) => {
  const mockId = req.params.id;
  const defaultPath = path.join(
    process.env.MOCK_DIR,
    'recordMocks',
    '_events.json'
  );

  try {
    // Read and parse the default.json file
    let defaultData = JSON.parse(fs.readFileSync(defaultPath, 'utf8'));

    // Find the index of the mock to be deleted
    const mockIndex = defaultData.findIndex((mock) => mock.id === mockId);

    if (mockIndex === -1) {
      return res.status(404).json({ error: 'Event not found' });
    }
    // Remove the mock from the array
    defaultData.splice(mockIndex, 1);

    // Write the updated data back to default.json
    fs.writeFileSync(defaultPath, JSON.stringify(defaultData, null, 2));

    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const recordEventData = async (req, res) => {
  const mockData = req.body;
  let mockDataSummary = [];

  try {
    console.log(mockData);
    mockData.id = uuidv4();
    const mockDir = path.join(process.env.MOCK_DIR, 'recordMocks');
    const mockEventsFilePath = path.join(mockDir, `_events.json`);
    const mockSnapsPath = path.join(mockDir, `_snaps`);
    if (!fs.existsSync(mockDir)) {
      fs.mkdirSync(mockDir);
    }
    if (!fs.existsSync(mockSnapsPath)) {
      fs.mkdirSync(mockSnapsPath);
    }
    if (!fs.existsSync(mockEventsFilePath)) {
      await fs.appendFile(mockEventsFilePath, '', () => {
        console.log('list file created successfully');
      });
      mockDataSummary = [];
    } else {
      mockDataSummary = JSON.parse(fs.readFileSync(mockEventsFilePath, 'utf8'));
    }
    if (mockDataSummary.length >= process.env.MOCK_RECORDER_LIMIT) {
      throw 'MOCK_RECORDER_LIMIT reached';
    } else {
      mockDataSummary.push({
        id: mockData.id, 
        type: mockData.type,
        target: mockData.target, 
        time: mockData.time,
        value: mockData.value,
      });
      if (mockData.bodyHtml) {
        const mockSnapFilePath = path.join(mockSnapsPath, `_snap_${ mockData.id}.html`);  
        fs.writeFileSync(
          mockSnapFilePath,
          mockData.bodyHtml
        );
      }
      fs.writeFileSync(
        mockEventsFilePath,
        JSON.stringify(mockDataSummary, null, 2)
      );
      res.json(mockData);
    }
  } catch (error) {
    console.error('Error updating mock data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getRecordedEvents,
  deleteRecordedEvent,
  recordEventData,
  deleteAllEvents,
};
