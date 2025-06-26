const express = require('express');
const logger = require('../utils/Logger');

const router = express.Router();

// Get logs with filtering
router.get('/logs', (req, res) => {
  try {
    const { date, level, requestId, limit = 100, offset = 0 } = req.query;

    const logs = logger.getLogs({
      date,
      level,
      requestId,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: logs,
      total: logs.length,
    });
  } catch (error) {
    logger.error('Error fetching logs', req.requestId, {
      error: error.message,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch logs',
    });
  }
});

// Get available log dates
router.get('/logs/dates', (req, res) => {
  try {
    const dates = logger.getAvailableDates();
    res.json({
      success: true,
      data: dates,
    });
  } catch (error) {
    logger.error('Error fetching log dates', req.requestId, {
      error: error.message,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch log dates',
    });
  }
});

// Get logs by request ID
router.get('/logs/request/:requestId', (req, res) => {
  try {
    const { requestId } = req.params;
    const logs = logger.getLogsByRequestId(requestId);

    res.json({
      success: true,
      data: logs,
      requestId,
    });
  } catch (error) {
    logger.error('Error fetching logs by request ID', req.requestId, {
      error: error.message,
      targetRequestId: req.params.requestId,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch logs by request ID',
    });
  }
});

// Clear old logs
router.delete('/logs/cleanup', (req, res) => {
  try {
    logger.cleanupOldLogs();
    res.json({
      success: true,
      message: 'Old logs cleaned up successfully',
    });
  } catch (error) {
    logger.error('Error cleaning up old logs', req.requestId, {
      error: error.message,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup old logs',
    });
  }
});

module.exports = router;
