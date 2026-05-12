const fs = require('fs');
const path = require('path');
const {
  getAbsolutePathWithMockDir,
  getParentFolder,
  nameToFolder,
} = require('../utils/MockUtils');

function findPlaywrightSpecInTree(dir, specBaseName) {
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findPlaywrightSpecInTree(fullPath, specBaseName);
      if (found) return found;
    } else if (entry.name === specBaseName) {
      return fullPath;
    }
  }
  return null;
}

/**
 * Resolves a path under PLAYWRIGHT_DIR/tests using only the basename of fileName
 * and ensures the result stays inside tests/.
 */
function resolveSafePlaywrightSpecPath(absolutePlaywrightDir, parents, fileName) {
  const testsRoot = path.resolve(absolutePlaywrightDir, 'tests');
  const parentFolder = getParentFolder(parents);
  const baseDir = path.resolve(testsRoot, parentFolder);
  if (baseDir !== testsRoot && !baseDir.startsWith(testsRoot + path.sep)) {
    throw new Error('Resolved directory escapes tests folder');
  }
  const rawName = String(fileName || '');
  const safeName = path.basename(rawName);
  if (!safeName || safeName === '.' || safeName === '..') {
    throw new Error('Invalid file name');
  }
  const filePath = path.resolve(baseDir, safeName);
  if (filePath !== baseDir && !filePath.startsWith(baseDir + path.sep)) {
    throw new Error('Invalid file path');
  }
  return { filePath, fullDirectoryPath: baseDir };
}

// POST /api/v1/code/save - Save generated code to file
const saveFile = async (req, res) => {
  try {
    const { generatedCode, fileName, parents } = req.body;

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

    let filePath;
    let fullDirectoryPath;
    try {
      ({ filePath, fullDirectoryPath } = resolveSafePlaywrightSpecPath(
        absolutePlaywrightDir,
        parents,
        fileName
      ));
    } catch (e) {
      return res.status(400).json({ error: e.message || 'Invalid path' });
    }

    if (!fs.existsSync(fullDirectoryPath)) {
      fs.mkdirSync(fullDirectoryPath, { recursive: true });
    }

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
    const { testName, generatedCode, fileName, parents, withUI } = req.body;
    const absolutePlaywrightDir = getAbsolutePathWithMockDir(
      process.env.PLAYWRIGHT_DIR || ''
    );

    if (
      fileName !== '__ftmocks-mock-mode-ignore-me.spec.js' &&
      fs.existsSync(
        path.join(
          absolutePlaywrightDir,
          'tests',
          '__ftmocks-mock-mode-ignore-me.spec.js'
        )
      )
    ) {
      fs.rmSync(
        path.join(
          absolutePlaywrightDir,
          'tests',
          '__ftmocks-mock-mode-ignore-me.spec.js'
        )
      );
    }

    let filePath;
    let fullDirectoryPath;
    try {
      ({ filePath, fullDirectoryPath } = resolveSafePlaywrightSpecPath(
        absolutePlaywrightDir,
        parents,
        fileName
      ));
    } catch (e) {
      return res.status(400).json({ error: e.message || 'Invalid path' });
    }

    if (!fs.existsSync(fullDirectoryPath)) {
      fs.mkdirSync(fullDirectoryPath, { recursive: true });
    }
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
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    } else {
      try {
        res.write(`\nError: ${error.message}\n`);
      } finally {
        res.end();
      }
    }
  }
};

// GET /api/v1/code/spec?name=...
// Reads `${nameToFolder(name).toLowerCase()}.spec.js` from PLAYWRIGHT_DIR/tests (recursive).
const getTestSpecCode = async (req, res) => {
  try {
    let rawName = req.query.name;
    if (Array.isArray(rawName)) {
      rawName = rawName[0];
    }
    let testName =
      typeof rawName === 'string' ? rawName.trim() : '';
    if (!testName) {
      return res
        .status(400)
        .json({ error: 'Missing or invalid query parameter: name' });
    }
    try {
      testName = decodeURIComponent(testName);
    } catch {
      /* use trimmed literal */
    }

    const pwDir = process.env.PLAYWRIGHT_DIR || '';
    if (!pwDir) {
      return res.status(503).json({
        error:
          'PLAYWRIGHT_DIR is not configured; cannot resolve Playwright spec path',
      });
    }

    const absolutePlaywrightDir = getAbsolutePathWithMockDir(pwDir);
    const testsRoot = path.join(absolutePlaywrightDir, 'tests');
    const specBaseName = `${nameToFolder(testName).toLowerCase()}.spec.js`;

    const filePath = findPlaywrightSpecInTree(testsRoot, specBaseName);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'Playwright spec not found',
        specFileName: specBaseName,
        testsRoot,
      });
    }

    const content = fs.readFileSync(filePath, 'utf8');
    res.status(200).json({
      fileName: specBaseName,
      filePath,
      relativePath: path.relative(absolutePlaywrightDir, filePath),
      content,
    });
  } catch (error) {
    console.error('Error reading Playwright spec:', error);
    res.status(500).json({
      error: 'Failed to read Playwright spec',
      details: error.message,
    });
  }
};

module.exports = {
  saveFile,
  runTest,
  getTestSpecCode,
};
