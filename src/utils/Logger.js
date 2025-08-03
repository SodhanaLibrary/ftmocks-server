const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logsDir = path.join(__dirname, '../../logs');
    this.ensureLogsDirectory();
  }

  ensureLogsDirectory() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  getCallerInfo() {
    const stack = new Error().stack;
    const stackLines = stack.split('\n');

    // Find the first line that's not from the Logger class
    let callerLine = '';
    for (let i = 3; i < stackLines.length; i++) {
      const line = stackLines[i];
      if (!line.includes('Logger.js') && !line.includes('node_modules')) {
        callerLine = line;
        break;
      }
    }

    if (callerLine) {
      // Extract file name and function name from stack trace
      const match = callerLine.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
      if (match) {
        const functionName = match[1];
        const filePath = match[2];
        const fileName = path.basename(filePath);
        return { fileName, functionName };
      }
    }

    return { fileName: 'unknown', functionName: 'unknown' };
  }

  log(level, message, additionalData = {}) {
    const timestamp = new Date().toISOString();
    const { fileName, functionName } = this.getCallerInfo();

    const logEntry = {
      id: require('uuid').v4(),
      timestamp,
      level: level.toUpperCase(),
      message,
      fileName,
      functionName,
      ...additionalData,
    };

    // Only write to file if debug mode is enabled
    if (process.env.debug) {
      console.log(logEntry);
      // // Write to daily log file
      // const today = new Date().toISOString().split('T')[0];
      // const logFile = path.join(this.logsDir, `${today}.json`);
      // let logs = [];
      // if (fs.existsSync(logFile)) {
      //   try {
      //     const content = fs.readFileSync(logFile, 'utf8');
      //     logs = JSON.parse(content);
      //   } catch (error) {
      //     console.error('Error reading log file:', error);
      //     logs = [];
      //   }
      // }
      // logs.push(logEntry);
      // try {
      //   fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
      // } catch (error) {
      //   console.error('Error writing to log file:', error);
      // }
    }

    // Always log to console in development or when debug is enabled
    if (process.env.NODE_ENV === 'development' || process.env.debug) {
      console.log(
        `[${timestamp}] [${level.toUpperCase()}] [${fileName}:${functionName}] ${message}`
      );
    }

    return logEntry;
  }

  info(message, additionalData = {}, consoleLog = false) {
    if (consoleLog) {
      console.log(message, additionalData);
    }
    return this.log('info', message, additionalData);
  }

  error(message, additionalData = {}, consoleLog = true) {
    if (consoleLog) {
      console.log(message, additionalData);
    }
    return this.log('error', message, additionalData);
  }

  warn(message, additionalData = {}, consoleLog = false) {
    if (consoleLog) {
      console.log(message, additionalData);
    }
    return this.log('warn', message, additionalData);
  }

  debug(message, additionalData = {}, consoleLog = false) {
    if (consoleLog) {
      console.log(message, additionalData);
    }
    return this.log('debug', message, additionalData);
  }

  // Log HTTP requests
  logRequest(req, res, next) {
    const startTime = Date.now();

    // Log request start
    this.info(`Request started: ${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      query: req.query,
      headers: req.headers,
      body: req.body,
      ip: req.ip,
    });

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function (chunk, encoding) {
      const duration = Date.now() - startTime;

      logger.info(`Request completed: ${req.method} ${req.path}`, {
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        responseSize: chunk ? chunk.length : 0,
      });

      originalEnd.call(this, chunk, encoding);
    };

    next();
  }

  // Get logs with filtering
  getLogs(options = {}) {
    const {
      date = new Date().toISOString().split('T')[0],
      level = null,
      limit = 100,
      offset = 0,
    } = options;

    const logFile = path.join(this.logsDir, `${date}.json`);

    if (!fs.existsSync(logFile)) {
      return [];
    }

    try {
      const content = fs.readFileSync(logFile, 'utf8');
      let logs = JSON.parse(content);

      // Apply filters
      if (level) {
        logs = logs.filter((log) => log.level === level.toUpperCase());
      }

      // Apply pagination
      logs = logs.slice(offset, offset + limit);

      return logs;
    } catch (error) {
      console.error('Error reading logs:', error);
      return [];
    }
  }

  // Get available log dates
  getAvailableDates() {
    if (!fs.existsSync(this.logsDir)) {
      return [];
    }

    const files = fs.readdirSync(this.logsDir);
    return files
      .filter((file) => file.endsWith('.json'))
      .map((file) => file.replace('.json', ''))
      .sort()
      .reverse();
  }

  // Clear old logs (keep last 30 days)
  cleanupOldLogs() {
    const dates = this.getAvailableDates();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];

    dates.forEach((date) => {
      if (date < cutoffDate) {
        const logFile = path.join(this.logsDir, `${date}.json`);
        try {
          fs.unlinkSync(logFile);
          console.log(`Deleted old log file: ${date}.json`);
        } catch (error) {
          console.error(`Error deleting log file ${date}.json:`, error);
        }
      }
    });
  }
}

const logger = new Logger();

module.exports = logger;
