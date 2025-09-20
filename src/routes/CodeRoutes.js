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
    const { testName, generatedCode, fileName } = req.body;
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
    // Change to the playwright directory before running the test
    process.chdir(absolutePlaywrightDir);

    execSync(
      `NODE_ENV=dev npx playwright test ${filePath} --headed --retries=0`
    );
  } catch (error) {
    console.error('Error running test:', error);
  }
  res.json({
    success: true,
    message: 'initiated test run successfully',
  });
};

module.exports = {
  saveFile,
  runTest,
};
