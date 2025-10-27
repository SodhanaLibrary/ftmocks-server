const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/Logger');
const { nameToFolder } = require('../utils/MockUtils');

const getRecordedEvents = async (req, res) => {
  const eventsPath = path.join(
    process.env.MOCK_DIR,
    req.query.name ? `test_${nameToFolder(req.query.name)}` : 'defaultMocks',
    '_events.json'
  );

  try {
    logger.info('Getting recorded events', {
      testName: req.query.name || 'defaultMocks',
      eventsPath,
    });

    let parsedData = [];

    if (fs.existsSync(eventsPath)) {
      const eventsData = fs.readFileSync(eventsPath, 'utf8');
      parsedData = JSON.parse(eventsData);
      logger.info('Successfully retrieved recorded events', {
        testName: req.query.name || 'defaultMocks',
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
      testName: req.query.name || 'defaultMocks',
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
    req.query.name ? `test_${nameToFolder(req.query.name)}` : 'defaultMocks',
    '_events.json'
  );
  const snapsPath = path.join(
    process.env.MOCK_DIR,
    req.query.name ? `test_${nameToFolder(req.query.name)}` : 'defaultMocks',
    '_snaps'
  );

  try {
    logger.info('Deleting all recorded events', {
      testName: req.query.name || 'defaultMocks',
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
      testName: req.query.name || 'defaultMocks',
      eventsDeleted: eventsExist,
      snapsDeleted: snapsExist,
    });

    res.status(200).json([]);
  } catch (error) {
    logger.error('Error deleting all events', {
      testName: req.query.name || 'defaultMocks',
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
    req.query.name ? `test_${nameToFolder(req.query.name)}` : 'defaultMocks',
    '_events.json'
  );

  try {
    logger.info('Deleting recorded event', {
      eventId: mockId,
      testName: req.query.name || 'defaultMocks',
      eventsPath,
    });

    // Read and parse the events.json file
    let eventsData = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));

    // Find the index of the mock to be deleted
    const mockIndex = eventsData.findIndex((mock) => mock.id === mockId);

    if (mockIndex === -1) {
      logger.warn('Event not found for deletion', {
        eventId: mockId,
        testName: req.query.name || 'defaultMocks',
      });
      return res.status(404).json({ error: 'Event not found' });
    }

    const eventToDelete = eventsData[mockIndex];
    logger.debug('Found event to delete', {
      eventId: mockId,
      eventType: eventToDelete.type,
      eventTime: eventToDelete.time,
      testName: req.query.name || 'defaultMocks',
    });

    // Remove the mock from the array
    eventsData.splice(mockIndex, 1);

    // Write the updated data back to events.json
    fs.writeFileSync(eventsPath, JSON.stringify(eventsData, null, 2));

    logger.info('Event deleted successfully', {
      eventId: mockId,
      testName: req.query.name || 'defaultMocks',
      remainingEvents: eventsData.length,
    });

    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    logger.error('Error deleting event', {
      eventId: mockId,
      testName: req.query.name || 'defaultMocks',
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
      testName: testName || 'defaultMocks',
      eventType: mockData.type,
      hasBodyHtml: !!mockData.bodyHtml,
    });

    mockData.id = uuidv4();
    const mockDir = path.join(
      process.env.MOCK_DIR,
      testName ? `test_${nameToFolder(testName)}` : 'defaultMocks'
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
      await fs.writeFileSync(mockEventsFilePath, '', () => {
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
          testName: testName || 'defaultMocks',
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
      testName: testName || 'defaultMocks',
      totalEvents: mockDataSummary.length,
      hasSnapshot: !!mockData.bodyHtml,
    });

    res.json(mockData);
  } catch (error) {
    logger.error('Error recording event data', {
      testName: testName || 'defaultMocks',
      eventType: mockData?.type,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateRecordedEvent = async (req, res) => {
  try {
    const testName = req.query.name || 'defaultMocks';
    const eventsPath = path.join(
      process.env.MOCK_DIR,
      testName ? `test_${nameToFolder(testName)}` : 'defaultMocks',
      '_events.json'
    );

    if (!fs.existsSync(eventsPath)) {
      logger.warn('Events file does not exist for update', { eventsPath });
      return res.status(404).json({ error: 'Events file not found' });
    }

    const eventsData = fs.readFileSync(eventsPath, 'utf8');
    let events = [];
    try {
      events = JSON.parse(eventsData);
    } catch (parseErr) {
      logger.error('Failed to parse events file during update', {
        eventsPath,
        error: parseErr.message,
      });
      return res.status(500).json({ error: 'Failed to parse events file' });
    }

    const eventId = req.params.id;
    const eventIndex = events.findIndex((e) => e.id === eventId);

    if (eventIndex === -1) {
      logger.warn('Event to update not found', { eventId, eventsPath });
      return res.status(404).json({ error: 'Event not found' });
    }

    // Update the event with new data from req.body
    const updatedEvent = {
      ...events[eventIndex],
      ...req.body,
      id: eventId, // Ensure id is not changed
    };
    events[eventIndex] = updatedEvent;

    fs.writeFileSync(eventsPath, JSON.stringify(events, null, 2));

    logger.info('Event updated successfully', {
      eventId,
      testName,
      eventsPath,
    });

    res.status(200).json(updatedEvent);
  } catch (error) {
    logger.error('Error updating recorded event', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const duplicateRecordedEvent = (req, res) => {
  try {
    const testName = req.query.name;
    if (!testName) {
      return res.status(400).json({ error: 'Test name is required' });
    }

    const eventsPath = path.join(
      process.env.MOCK_DIR,
      testName ? `test_${nameToFolder(testName)}` : 'defaultMocks',
      '_events.json'
    );

    if (!fs.existsSync(eventsPath)) {
      logger.warn('Events file does not exist for duplication', { eventsPath });
      return res.status(404).json({ error: 'Events file not found' });
    }

    const eventsData = fs.readFileSync(eventsPath, 'utf8');
    let events = [];
    try {
      events = JSON.parse(eventsData);
    } catch (parseErr) {
      logger.error('Failed to parse events file during duplication', {
        eventsPath,
        error: parseErr.message,
      });
      return res.status(500).json({ error: 'Failed to parse events file' });
    }

    const eventId = req.params.id;
    const eventIndex = events.findIndex((e) => e.id === eventId);

    if (eventIndex === -1) {
      logger.warn('Event to duplicate not found', { eventId, eventsPath });
      return res.status(404).json({ error: 'Event not found' });
    }

    // Duplicate the event with a new id
    const duplicatedEvent = {
      ...events[eventIndex],
      id: uuidv4(),
    };
    events.splice(eventIndex + 1, 0, duplicatedEvent);

    fs.writeFileSync(eventsPath, JSON.stringify(events, null, 2));

    logger.info('Event duplicated successfully', {
      originalEventId: eventId,
      duplicatedEventId: duplicatedEvent.id,
      testName,
      eventsPath,
    });

    res.status(201).json(duplicatedEvent);
  } catch (error) {
    logger.error('Error duplicating recorded event', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Adds an empty event to the events file for a given test
const addEmptyEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const testName = req.query.name;
    if (!testName) {
      return res.status(400).json({ error: 'Test name is required' });
    }

    const eventsPath = path.join(
      process.env.MOCK_DIR,
      testName ? `test_${nameToFolder(testName)}` : 'defaultMocks',
      '_events.json'
    );

    // Ensure the events file exists, or create it if not
    if (!fs.existsSync(eventsPath)) {
      fs.writeFileSync(eventsPath, '[]');
    }

    const eventsData = fs.readFileSync(eventsPath, 'utf8');
    let events = [];
    try {
      events = JSON.parse(eventsData);
    } catch (parseErr) {
      logger.error('Failed to parse events file during addEmptyEvent', {
        eventsPath,
        error: parseErr.message,
      });
      return res.status(500).json({ error: 'Failed to parse events file' });
    }

    // Create a new empty event
    const newEvent = {
      id: uuidv4(),
      type: '',
      target: '',
      value: '',
      time: new Date().toISOString(),
    };
    // Find the index of the event with the given eventId
    let insertIndex = events.findIndex((event) => event.id === eventId);
    if (insertIndex === -1) {
      // If not found, just push to the end
      events.push(newEvent);
    } else {
      // Insert newEvent right after the found event
      events.splice(insertIndex + 1, 0, newEvent);
    }

    fs.writeFileSync(eventsPath, JSON.stringify(events, null, 2));

    logger.info('Empty event added successfully', {
      newEventId: newEvent.id,
      testName,
      eventsPath,
    });

    res.status(201).json(newEvent);
  } catch (error) {
    logger.error('Error adding empty event', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const reorderRecordedEvents = (req, res) => {
  try {
    const testName = req.query.name;
    const { eventIds } = req.body;

    if (!testName || !Array.isArray(eventIds)) {
      return res
        .status(400)
        .json({ error: 'Missing test name or eventIds array' });
    }

    const eventsPath = path.join(
      process.env.MOCK_DIR,
      testName ? `test_${nameToFolder(testName)}` : 'defaultMocks',
      '_events.json'
    );

    if (!fs.existsSync(eventsPath)) {
      return res.status(404).json({ error: 'Events file not found' });
    }

    const eventsData = fs.readFileSync(eventsPath, 'utf8');
    let events = [];
    try {
      events = JSON.parse(eventsData);
    } catch (parseErr) {
      logger.error('Failed to parse events file during reorder', {
        eventsPath,
        error: parseErr.message,
      });
      return res.status(500).json({ error: 'Failed to parse events file' });
    }

    // Create a map for quick lookup
    const eventMap = {};
    events.forEach((event) => {
      eventMap[event.id] = event;
    });

    // Reorder events according to eventIds
    const reorderedEvents = [];
    for (const id of eventIds) {
      if (eventMap[id]) {
        reorderedEvents.push(eventMap[id]);
      }
    }

    // Optionally, append any events that were not included in eventIds (shouldn't happen, but for safety)
    if (reorderedEvents.length !== events.length) {
      events.forEach((event) => {
        if (!eventIds.includes(event.id)) {
          reorderedEvents.push(event);
        }
      });
    }

    fs.writeFileSync(eventsPath, JSON.stringify(reorderedEvents, null, 2));

    logger.info('Events reordered successfully', {
      testName,
      eventsPath,
      newOrder: eventIds,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error reordering events', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getRecordedEvents,
  deleteRecordedEvent,
  updateRecordedEvent,
  recordEventData,
  deleteAllEvents,
  duplicateRecordedEvent,
  addEmptyEvent,
  reorderRecordedEvents,
};
