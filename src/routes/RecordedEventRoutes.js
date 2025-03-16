const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { nameToFolder } = require('../utils/MockUtils');

const getRecordedEvents = async (req, res) => {
  const eventsPath  = path.join(
    process.env.MOCK_DIR,
    req.query.name ? `test_${nameToFolder(req.query.name)}` : 'recordMocks',
    '_events.json'
  );

  try {
    if (!fs.existsSync(eventsPath)) {
      await fs.appendFile(eventsPath, '[]', () => {
        console.log('events file created successfully');
      });
    }
    const eventsData = fs.readFileSync(eventsPath, 'utf8');
    let parsedData = JSON.parse(eventsData);
    
    res.status(200).json(parsedData);
  } catch (error) {
    console.error(`Error reading or parsing events.json:`, error);
    res.status(200).json([]);
  }
};

const deleteAllEvents = async (req, res) => {
  const eventsPath = path.join(
    process.env.MOCK_DIR,
    req.query.name ? `test_${nameToFolder(req.query.name)}` : 'recordMocks',
    '_events.json'
  );
  const snapsPath = path.join(
    process.env.MOCK_DIR,
    req.query.name ? `test_${nameToFolder(req.query.name)}` : 'recordMocks',
    '_snaps'
  );

  try {
    fs.rmSync(eventsPath, { recursive: true, force: true });
    fs.rmSync(snapsPath, { recursive: true, force: true });
    res.status(200).json([]);
  } catch (error) {
    console.error(`Error reading or parsing events.json:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteRecordedEvent = async (req, res) => {
  const mockId = req.params.id;
  const eventsPath = path.join(
    process.env.MOCK_DIR,
    req.query.name ? `test_${nameToFolder(req.query.name)}` : 'recordMocks',
    '_events.json'
  );

  try {
    // Read and parse the events.json file
    let eventsData = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));

    // Find the index of the mock to be deleted
    const mockIndex = eventsData.findIndex((mock) => mock.id === mockId);

    if (mockIndex === -1) {
      return res.status(404).json({ error: 'Event not found' });
    }
    // Remove the mock from the array
    eventsData.splice(mockIndex, 1);

    // Write the updated data back to events.json
    fs.writeFileSync(eventsPath, JSON.stringify(eventsData, null, 2));

    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const recordEventData = async (req, res) => {
  const mockData = req.body;
  const testName = process.env.recordTest;
  let mockDataSummary = [];

  try {
    console.log(mockData);
    mockData.id = uuidv4();
    const mockDir = path.join(process.env.MOCK_DIR, testName ? `test_${nameToFolder(testName)}` : 'recordMocks');
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
        console.log('list of events file created successfully');
      });
      mockDataSummary = [];
    } else {
      mockDataSummary = JSON.parse(fs.readFileSync(mockEventsFilePath, 'utf8'));
    }
    if (mockDataSummary.length >= process.env.MOCK_RECORDER_LIMIT) {
      throw 'MOCK_RECORDER_LIMIT reached';
    } else {
      // Check for duplicate events with same type and time
      const isDuplicate = mockDataSummary.some(event => 
        event.type === mockData.type && 
        event.time === mockData.time
      );
      if (isDuplicate) {
        console.log('Duplicate event - same type and time already exists');
        return res.json({ message: 'Duplicate event - same type and time already exists' });
      }
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
