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
 * Resolves a path under a given tests root using only the basename of fileName
 * and ensures the result stays inside that root.
 */
function resolveSafeSpecPathUnderRoot(testsRoot, parents, fileName) {
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

/**
 * Picks the tests root for a generated file. React test files (*.test.js) go to
 * REACT_TESTS_DIR (which already points at the tests directory); everything else
 * goes under PLAYWRIGHT_DIR/tests. Mirrors how PLAYWRIGHT_DIR locates specs.
 */
function resolveTestsRootForFile(fileName) {
  const isReactTest = /\.test\.js$/i.test(String(fileName || ''));
  if (isReactTest && process.env.REACT_TESTS_DIR) {
    return getAbsolutePathWithMockDir(process.env.REACT_TESTS_DIR);
  }
  const absolutePlaywrightDir = getAbsolutePathWithMockDir(
    process.env.PLAYWRIGHT_DIR || ''
  );
  return path.resolve(absolutePlaywrightDir, 'tests');
}

function isReactTestFile(fileName) {
  return /\.test\.js$/i.test(String(fileName || ''));
}

/**
 * Walks up from startDir to find the nearest directory containing package.json.
 * Used as the working directory when running React tests (jest resolves its
 * config/rootDir from the project root). Returns null if none is found.
 */
function findNearestPackageJsonDir(startDir) {
  let dir = path.resolve(startDir);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
}

/**
 * Builds the { command, args, cwd, env } used to run a generated test file.
 * React test files (*.test.js) run via REACT_TEST_COMMAND (default `npx jest`)
 * from the nearest package.json directory; everything else runs via Playwright.
 */
function buildTestRunSpec(filePath, fileName, withUI) {
  if (isReactTestFile(fileName)) {
    const reactCommand = process.env.REACT_TEST_COMMAND || 'npx jest';
    const parts = reactCommand.split(/\s+/).filter(Boolean);
    const [command, ...commandArgs] = parts;
    const cwd =
      findNearestPackageJsonDir(path.dirname(filePath)) ||
      getAbsolutePathWithMockDir(process.env.REACT_TESTS_DIR || '');
    return {
      command,
      args: [...commandArgs, filePath],
      cwd,
      env: { ...process.env, NODE_ENV: 'test' },
    };
  }

  const absolutePlaywrightDir = getAbsolutePathWithMockDir(
    process.env.PLAYWRIGHT_DIR || ''
  );
  return {
    command: 'npx',
    args: [
      'playwright',
      'test',
      filePath,
      '--retries=0',
      withUI ? '--ui' : '--headed',
    ],
    cwd: absolutePlaywrightDir,
    env: { ...process.env, NODE_ENV: 'dev' },
  };
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

    let filePath;
    let fullDirectoryPath;
    try {
      const testsRoot = resolveTestsRootForFile(fileName);
      ({ filePath, fullDirectoryPath } = resolveSafeSpecPathUnderRoot(
        testsRoot,
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
    const isReactTest = isReactTestFile(fileName);

    // Playwright-only: clean up the transient mock-mode spec before a real run.
    if (!isReactTest) {
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
    }

    let filePath;
    let fullDirectoryPath;
    try {
      const testsRoot = resolveTestsRootForFile(fileName);
      ({ filePath, fullDirectoryPath } = resolveSafeSpecPathUnderRoot(
        testsRoot,
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
    const { command, args, cwd, env } = buildTestRunSpec(
      filePath,
      fileName,
      withUI
    );
    const testProcess = spawn(command, args, { env, cwd });

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

    const isReact = process.env.PROJECT_TYPE === 'react';

    let rootDir;
    let testsRoot;
    let specBaseName;
    if (isReact) {
      const reactDir = process.env.REACT_TESTS_DIR || '';
      if (!reactDir) {
        return res.status(503).json({
          error:
            'REACT_TESTS_DIR is not configured; cannot resolve React test path',
        });
      }
      // REACT_TESTS_DIR already points at the tests directory.
      rootDir = getAbsolutePathWithMockDir(reactDir);
      testsRoot = rootDir;
      specBaseName = `${nameToFolder(testName).toLowerCase()}.test.js`;
    } else {
      const pwDir = process.env.PLAYWRIGHT_DIR || '';
      if (!pwDir) {
        return res.status(503).json({
          error:
            'PLAYWRIGHT_DIR is not configured; cannot resolve Playwright spec path',
        });
      }
      rootDir = getAbsolutePathWithMockDir(pwDir);
      testsRoot = path.join(rootDir, 'tests');
      specBaseName = `${nameToFolder(testName).toLowerCase()}.spec.js`;
    }

    const filePath = findPlaywrightSpecInTree(testsRoot, specBaseName);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({
        error: isReact ? 'React test not found' : 'Playwright spec not found',
        specFileName: specBaseName,
        testsRoot,
      });
    }

    const content = fs.readFileSync(filePath, 'utf8');
    res.status(200).json({
      fileName: specBaseName,
      filePath,
      relativePath: path.relative(rootDir, filePath),
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
