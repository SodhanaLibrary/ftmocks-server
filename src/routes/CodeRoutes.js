const fs = require('fs');
const path = require('path');
const { getAbsolutePathWithMockDir } = require('../utils/MockUtils');
const { execSync } = require('child_process');

// POST /api/v1/code/save - Save generated code to file
const saveFile = async (req, res) => {
  try {
    const { generatedCode, fileName } = req.body;

    // Validate required fields
    if (!generatedCode || !fileName) {
      return res.status(400).json({
        error:
          'Missing required fields: generatedCode, fileName, and directory are required',
      });
    }

    const absolutePlaywrightDir = getAbsolutePathWithMockDir(
      process.env.PLAYWRIGHT_DIR || ''
    );

    // Ensure the directory exists
    const fullDirectoryPath = path.join(absolutePlaywrightDir, 'tests');
    if (!fs.existsSync(fullDirectoryPath)) {
      fs.mkdirSync(fullDirectoryPath, { recursive: true });
    }

    // Create the full file path
    const filePath = path.join(fullDirectoryPath, fileName);

    // Write the file
    fs.writeFileSync(filePath, generatedCode, 'utf8');

    res.json({
      success: true,
      message: 'File saved successfully',
      filePath: filePath,
    });
  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({
      error: 'Failed to save file',
      details: error.message,
    });
  }
};

const runTest = async (req, res) => {
  try {
    const { testName, generatedCode, fileName, withUI } = req.body;
    const absolutePlaywrightDir = getAbsolutePathWithMockDir(
      process.env.PLAYWRIGHT_DIR || ''
    );

    // Ensure the directory exists
    const fullDirectoryPath = path.join(absolutePlaywrightDir, 'tests');
    if (!fs.existsSync(fullDirectoryPath)) {
      fs.mkdirSync(fullDirectoryPath, { recursive: true });
    }
    const filePath = path.join(fullDirectoryPath, fileName);
    fs.writeFileSync(filePath, generatedCode, 'utf8');

    // Set up streaming response
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    // Use spawn instead of execSync to capture output in real-time
    const { spawn } = require('child_process');
    const testProcess = spawn(
      'npx',
      [
        'playwright',
        'test',
        filePath,
        '--retries=0',
        withUI ? '--ui' : '--headed',
      ],
      {
        env: { ...process.env, NODE_ENV: 'dev' },
        cwd: absolutePlaywrightDir,
      }
    );

    // Stream stdout to response
    testProcess.stdout.on('data', (data) => {
      console.log('stdout: ', data.toString());
      res.write(data.toString());
    });

    // Stream stderr to response
    testProcess.stderr.on('data', (data) => {
      console.log('stderr: ', data.toString());
      res.write(data.toString());
    });

    // Handle process completion
    testProcess.on('close', (code) => {
      console.log('close: ', code);
      res.write(`\nTest process completed with exit code: ${code}\n`);
      res.end();
    });

    // Handle process errors
    testProcess.on('error', (error) => {
      console.log('error: ', error);
      res.write(`\nError running test: ${error.message}\n`);
      res.end();
    });
  } catch (error) {
    console.error('Error running test:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  saveFile,
  runTest,
};
