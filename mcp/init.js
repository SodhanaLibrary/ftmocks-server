/**
 * Project scaffolding — same behavior as `npx ftmocks init` / `init-playwright`.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function resolveProjectRoot(projectDir) {
  const root = projectDir
    ? path.resolve(projectDir)
    : process.cwd();
  if (!fs.existsSync(root)) {
    throw new Error(`Project directory does not exist: ${root}`);
  }
  if (!fs.statSync(root).isDirectory()) {
    throw new Error(`Not a directory: ${root}`);
  }
  return root;
}

function runCommand(command, cwd, log) {
  log.push(`▶️  ${command}`);
  try {
    const out = execSync(command, {
      cwd,
      env: { ...process.env, CI: 'true' },
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    if (out && out.trim()) log.push(out.trim());
  } catch (err) {
    const stderr = err.stderr?.toString?.() || '';
    const stdout = err.stdout?.toString?.() || '';
    const detail = [stderr, stdout].filter(Boolean).join('\n').trim();
    throw new Error(
      detail ? `Command failed: ${command}\n${detail}` : `Command failed: ${command}`
    );
  }
}

function createFile(filePath, content, log) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, 'utf8');
    log.push(`✅ Created: ${filePath}`);
  } else {
    log.push(`⚠️  Skipped (already exists): ${filePath}`);
  }
}

function createFolder(folderPath, log) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    log.push(`✅ Created directory: ${folderPath}`);
  } else {
    log.push(`⚠️  Skipped (already exists): ${folderPath}`);
  }
}

function init(projectRoot, log) {
  const ftmocksDir = path.join(projectRoot, 'ftmocks');
  createFolder(ftmocksDir, log);
  createFile(path.join(ftmocksDir, 'mockServer.config.json'), '{}', log);
  const defaultMocksDir = path.join(ftmocksDir, 'defaultMocks');
  createFolder(defaultMocksDir, log);
  createFile(path.join(defaultMocksDir, '_mock_list.json'), '[]', log);
  createFile(path.join(defaultMocksDir, '_served.json'), '[]', log);
  createFile(
    path.join(ftmocksDir, 'ftmocks.env'),
    `MOCK_DIR=./
PORT=5000
PREFERRED_SERVER_PORTS=[6080]
PLAYWRIGHT_DIR=../playwright
FALLBACK_DIR=../public
`,
    log
  );
  const envPath = path.join(ftmocksDir, 'ftmocks.env');
  let setupReadmeContent = fs.readFileSync(
    path.join(__dirname, 'SETUP_README.md'),
    'utf8'
  );
  setupReadmeContent = setupReadmeContent.replace(
    'npm start <path to env>',
    `npm start ${envPath}`
  );
  createFile(path.join(ftmocksDir, 'README.md'), setupReadmeContent, log);
  return { ftmocksDir, envPath };
}

function initPlaywright(projectRoot, log) {
  const { envPath } = init(projectRoot, log);
  const playwrightDir = path.join(projectRoot, 'playwright');
  createFolder(playwrightDir, log);
  runCommand(
    'npm init playwright@latest -- --browser=chromium',
    playwrightDir,
    log
  );
  runCommand('npx playwright install', playwrightDir, log);
  runCommand('npm install --save ftmocks-utils', playwrightDir, log);
  runCommand('npm install --save pixelmatch', playwrightDir, log);
  runCommand('npm install --save pngjs', playwrightDir, log);
  return { envPath, playwrightDir };
}

function formatResult(log, extra = {}) {
  return {
    content: [
      {
        type: 'text',
        text: [...log, '', JSON.stringify(extra, null, 2)].join('\n'),
      },
    ],
  };
}

function formatError(err) {
  const msg = err instanceof Error ? err.message : String(err);
  return {
    content: [{ type: 'text', text: msg }],
    isError: true,
  };
}

module.exports = {
  resolveProjectRoot,
  init,
  initPlaywright,
  formatResult,
  formatError,
};
