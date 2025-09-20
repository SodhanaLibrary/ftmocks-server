const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/Logger');
const { nameToFolder } = require('../utils/MockUtils');

const getRecordedEvents = async (req, res) => {
  const eventsPath = path.join(
    process.env.MOCK_DIR,
    req.query.name ? `test_${nameToFolder(req.query.name)}` : 'recordMocks',
    '_events.json'
  );

  try {
    logger.info('Getting recorded events', {
      testName: req.query.name || 'recordMocks',
      eventsPath,
    });

    let parsedData = [];

    if (fs.existsSync(eventsPath)) {
      const eventsData = fs.readFileSync(eventsPath, 'utf8');
      parsedData = JSON.parse(eventsData);
      logger.info('Successfully retrieved recorded events', {
        testName: req.query.name || 'recordMocks',
        eventCount: parsedData.length,
        eventsPath,
      });
    } else {
      logger.info('Events file does not exist', {
        eventsPath,
      });
    }

    res.status(200).json(parsedData);
  } catch (error) {
    logger.error('Error reading or parsing events file', {
      testName: req.query.name || 'recordMocks',
      eventsPath,
      error: error.message,
      stack: error.stack,
    });
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
    logger.info('Deleting all recorded events', {
      testName: req.query.name || 'recordMocks',
      eventsPath,
      snapsPath,
    });

    // Check if files exist before deletion
    const eventsExist = fs.existsSync(eventsPath);
    const snapsExist = fs.existsSync(snapsPath);

    logger.debug('Files existence check', {
      eventsFileExists: eventsExist,
      snapsDirExists: snapsExist,
    });

    if (eventsExist) {
      fs.rmSync(eventsPath, { recursive: true, force: true });
      logger.debug('Deleted events file', { eventsPath });
    }

    if (snapsExist) {
      fs.rmSync(snapsPath, { recursive: true, force: true });
      logger.debug('Deleted snaps directory', { snapsPath });
    }

    logger.info('All recorded events deleted successfully', {
      testName: req.query.name || 'recordMocks',
      eventsDeleted: eventsExist,
      snapsDeleted: snapsExist,
    });

    res.status(200).json([]);
  } catch (error) {
    logger.error('Error deleting all events', {
      testName: req.query.name || 'recordMocks',
      eventsPath,
      snapsPath,
      error: error.message,
      stack: error.stack,
    });
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
    logger.info('Deleting recorded event', {
      eventId: mockId,
      testName: req.query.name || 'recordMocks',
      eventsPath,
    });

    // Read and parse the events.json file
    let eventsData = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));

    // Find the index of the mock to be deleted
    const mockIndex = eventsData.findIndex((mock) => mock.id === mockId);

    if (mockIndex === -1) {
      logger.warn('Event not found for deletion', {
        eventId: mockId,
        testName: req.query.name || 'recordMocks',
      });
      return res.status(404).json({ error: 'Event not found' });
    }

    const eventToDelete = eventsData[mockIndex];
    logger.debug('Found event to delete', {
      eventId: mockId,
      eventType: eventToDelete.type,
      eventTime: eventToDelete.time,
      testName: req.query.name || 'recordMocks',
    });

    // Remove the mock from the array
    eventsData.splice(mockIndex, 1);

    // Write the updated data back to events.json
    fs.writeFileSync(eventsPath, JSON.stringify(eventsData, null, 2));

    logger.info('Event deleted successfully', {
      eventId: mockId,
      testName: req.query.name || 'recordMocks',
      remainingEvents: eventsData.length,
    });

    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    logger.error('Error deleting event', {
      eventId: mockId,
      testName: req.query.name || 'recordMocks',
      eventsPath,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const recordEventData = async (req, res) => {
  const mockData = req.body;
  const testName = process.env.recordTest;
  let mockDataSummary = [];

  try {
    logger.info('Recording event data', {
      testName: testName || 'recordMocks',
      eventType: mockData.type,
      hasBodyHtml: !!mockData.bodyHtml,
    });

    mockData.id = uuidv4();
    const mockDir = path.join(
      process.env.MOCK_DIR,
      testName ? `test_${nameToFolder(testName)}` : 'recordMocks'
    );
    const mockEventsFilePath = path.join(mockDir, `_events.json`);
    const mockSnapsPath = path.join(mockDir, `_snaps`);

    logger.debug('Event recording paths', {
      mockDir,
      mockEventsFilePath,
      mockSnapsPath,
    });

    // Create directories if they don't exist
    if (!fs.existsSync(mockDir)) {
      fs.mkdirSync(mockDir);
      logger.debug('Created mock directory', { mockDir });
    }

    if (!fs.existsSync(mockSnapsPath)) {
      fs.mkdirSync(mockSnapsPath);
      logger.debug('Created snaps directory', { mockSnapsPath });
    }

    if (!fs.existsSync(mockEventsFilePath)) {
      logger.info('Events file does not exist, creating new file', {
        mockEventsFilePath,
      });
      await fs.appendFile(mockEventsFilePath, '', () => {
        logger.info('Events file created successfully', { mockEventsFilePath });
      });
      mockDataSummary = [];
    } else {
      mockDataSummary = JSON.parse(fs.readFileSync(mockEventsFilePath, 'utf8'));
      logger.debug('Loaded existing events', {
        eventCount: mockDataSummary.length,
      });
    }

    // Check for duplicate events
    const isDuplicate = mockDataSummary.some(
      (event) => event.type === mockData.type && event.time === mockData.time
    );

    if (isDuplicate) {
      logger.info(
        'Duplicate event detected - same type and time already exists',
        {
          eventType: mockData.type,
          eventTime: mockData.time,
          testName: testName || 'recordMocks',
        }
      );
      return res.json({
        message: 'Duplicate event - same type and time already exists',
      });
    }

    // Add event to summary
    const eventSummary = {
      id: mockData.id,
      type: mockData.type,
      target: mockData.target,
      time: mockData.time,
      value: mockData.value,
    };

    mockDataSummary.push(eventSummary);

    logger.debug('Added event to summary', {
      eventId: mockData.id,
      eventType: mockData.type,
      eventTime: mockData.time,
      totalEvents: mockDataSummary.length,
    });

    // Save HTML snapshot if provided
    if (mockData.bodyHtml) {
      const mockSnapFilePath = path.join(
        mockSnapsPath,
        `_snap_${mockData.id}.html`
      );
      fs.writeFileSync(mockSnapFilePath, mockData.bodyHtml);
      logger.debug('Saved HTML snapshot', {
        eventId: mockData.id,
        snapFilePath: mockSnapFilePath,
        htmlSize: mockData.bodyHtml.length,
      });
    }

    // Write updated events file
    fs.writeFileSync(
      mockEventsFilePath,
      JSON.stringify(mockDataSummary, null, 2)
    );

    logger.info('Event recorded successfully', {
      eventId: mockData.id,
      eventType: mockData.type,
      testName: testName || 'recordMocks',
      totalEvents: mockDataSummary.length,
      hasSnapshot: !!mockData.bodyHtml,
    });

    res.json(mockData);
  } catch (error) {
    logger.error('Error recording event data', {
      testName: testName || 'recordMocks',
      eventType: mockData?.type,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getRecordedEvents,
  deleteRecordedEvent,
  recordEventData,
  deleteAllEvents,
};
