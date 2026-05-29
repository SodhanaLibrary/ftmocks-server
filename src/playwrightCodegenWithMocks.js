const fs = require('fs');
const path = require('path');
const os = require('os');
const { chromium } = require('playwright');
const logger = require('./utils/Logger');
const {
  nameToFolder,
  getAbsolutePathWithMockDir,
  getParentFolder,
  getParentNamesFromTestTree,
} = require('./utils/MockUtils');
const { addUrlToProject } = require('./utils/projectUtils');
const {
  attachNetworkMockRecording,
  getContextOptionsFromEnv,
} = require('./utils/networkMockRecording');
const { injectEventRecordingScript } = require('./routes/RecordRoutes');

function normalizeCodegenUrl(url) {
  if (!url) return '';
  if (fs.existsSync(url)) return 'file://' + path.resolve(url);
  if (
    !url.startsWith('http') &&
    !url.startsWith('file://') &&
    !url.startsWith('about:') &&
    !url.startsWith('data:')
  ) {
    return 'http://' + url;
  }
  return url;
}

/** Remove `test.use({ ... });` (e.g. bogus baseURL / httpCredentials from codegen context). */
function stripTestUseCalls(source) {
  const marker = 'test.use';
  let out = '';
  let i = 0;
  while (i < source.length) {
    const idx = source.indexOf(marker, i);
    if (idx === -1) {
      out += source.slice(i);
      break;
    }
    if (idx > 0 && /[A-Za-z0-9_]/.test(source[idx - 1])) {
      out += source.slice(i, idx + marker.length);
      i = idx + marker.length;
      continue;
    }
    out += source.slice(i, idx);
    const openParen = source.indexOf('(', idx);
    if (openParen === -1) {
      out += source.slice(idx);
      break;
    }
    let depth = 0;
    let j = openParen;
    for (; j < source.length; j++) {
      const c = source[j];
      if (c === '(') depth++;
      else if (c === ')') {
        depth--;
        if (depth === 0) {
          j++;
          while (j < source.length && /\s/.test(source[j])) j++;
          if (source[j] === ';') j++;
          i = j;
          break;
        }
      }
    }
    if (j >= source.length) {
      out += source.slice(idx);
      break;
    }
  }
  return out;
}

function ensureFtmocksUtilsImport(source) {
  if (/initiatePlaywrightRoutes/.test(source)) return source;
  return source.replace(
    /(import\s*\{[^}]+\}\s*from\s*['"]@playwright\/test['"]\s*;)/,
    "$1\nimport { initiatePlaywrightRoutes } from 'ftmocks-utils';"
  );
}

/**
 * Rewrite default Playwright codegen into ftmocks pattern (initiatePlaywrightRoutes + mock paths).
 * @param {{ mockDir: string, fallbackDir: string, testName: string, stripInitialGoto?: boolean }} opts — set stripInitialGoto true to remove the first await page.goto
 */
function transformPlaywrightCodegenForFtmocks(source, opts) {
  const {
    mockDir,
    fallbackDir,
    testName,
    stripInitialGoto = false,
  } = opts;
  let s = stripTestUseCalls(source);
  s = ensureFtmocksUtilsImport(s);

  if (testName) {
    s = s.replace(
      /test\s*\(\s*(?:'[^']*'|"[^"]*"|`[^`]*`)\s*,/,
      `test(${JSON.stringify(testName)},`
    );
  }

  if (/\binitiatePlaywrightRoutes\s*\(/.test(s)) {
    return s;
  }

  const mockLit = JSON.stringify(mockDir);
  const fallLit = JSON.stringify(fallbackDir);
  const nameLit = JSON.stringify(testName || 'test');

  const injection = ` await initiatePlaywrightRoutes(
        page,
        {
          MOCK_DIR: ${mockLit},
          FALLBACK_DIR: ${fallLit},
        },
        ${nameLit}
      );
`;

  const testHeader =
    /test\s*\(\s*(?:'[^']*'|"[^"]*"|`[^`]*`)\s*,\s*async\s*\(\s*\{\s*page\s*\}\s*\)\s*=>\s*\{\s*/;
  const m = s.match(testHeader);
  if (!m || m.index === undefined) {
    return s;
  }
  const insertAt = m.index + m[0].length;
  let remainder = s.slice(insertAt);
  if (stripInitialGoto) {
    remainder = remainder.replace(/^\s*await\s+page\.goto\([^)]*\);\s*\n?/, '');
  }
  return s.slice(0, insertAt) + '\n' + injection + '\n' + remainder;
}

function rewriteCodegenOutputWithFtmocks(outputPath, body) {
  if (body.transformCodegen === false) return;
  try {
    if (!fs.existsSync(outputPath)) return;
    const source = fs.readFileSync(outputPath, 'utf8');
    const mockDir =
      body.codegenMockDir ||
      body.mockDir ||
      process.env.RELATIVE_MOCK_DIR_FROM_PLAYWRIGHT_DIR ||
      './ftmocks';
    const fallbackDir =
      body.codegenFallbackDir ||
      body.fallbackDir ||
      process.env.RELATIVE_FALLBACK_DIR_FROM_PLAYWRIGHT_DIR ||
      'public';
    const transformed = transformPlaywrightCodegenForFtmocks(source, {
      mockDir,
      fallbackDir,
      testName: body.testName,
      stripInitialGoto: body.codegenStripInitialGoto === true,
    });
    if (transformed !== source) {
      fs.writeFileSync(outputPath, transformed, 'utf8');
    }
  } catch (err) {
    logger.warn('Playwright codegen ftmocks rewrite failed', {
      outputFile: outputPath,
      error: String(err),
    });
  }
}

function resolveCodegenSaveDir(body, outputPath) {
  if (body.codegenSaveDir != null && String(body.codegenSaveDir).trim() !== '') {
    return path.resolve(process.cwd(), String(body.codegenSaveDir));
  }
  if (process.env.PLAYWRIGHT_DIR) {
    try {
      const pwRoot = getAbsolutePathWithMockDir(process.env.PLAYWRIGHT_DIR);
      return path.join(pwRoot, 'tests');
    } catch {
      /* use output dir */
    }
  }
  return path.dirname(outputPath);
}

/** @returns {string | null} Absolute path to the saved spec file, or null if none. */
function logCodegenOutputFile(outputPath, body = {}) {
  try {
    if (!fs.existsSync(outputPath)) {
      logger.info(
        'Playwright codegen finished with no output file (no recorded steps or codegen did not flush)',
        { outputFile: outputPath },
        true
      );
      return null;
    }
    const generated = fs.readFileSync(outputPath, 'utf8');
    if (!generated.trim()) {
      logger.info(
        'Playwright codegen output file is empty',
        {
          outputFile: outputPath,
        },
        true
      );
      return null;
    }

    let savedPath = outputPath;
    const testName = body.testName;
    if (testName) {
      const saveFileName = `${nameToFolder(testName).toLowerCase()}.spec.js`;
      const baseSaveDir = resolveCodegenSaveDir(body, outputPath);
      let parentsList = body.parents;
      if (!parentsList || parentsList.length === 0) {
        parentsList = getParentNamesFromTestTree(
          body.testCases,
          body.selectedTest
        );
      }
      const parentRel =
        parentsList && parentsList.length
          ? getParentFolder(parentsList)
          : '';
      const saveDir = parentRel
        ? path.join(baseSaveDir, parentRel)
        : baseSaveDir;
      fs.mkdirSync(saveDir, { recursive: true });
      const targetPath = path.join(saveDir, saveFileName);
      if (path.resolve(targetPath) !== path.resolve(outputPath)) {
        fs.writeFileSync(targetPath, generated, 'utf8');
        savedPath = targetPath;
      } else {
        fs.writeFileSync(outputPath, generated, 'utf8');
      }
    }

    logger.info(
      'Playwright codegen generated script',
      {
        outputFile: outputPath,
        savedTo: savedPath,
        generatedCode: generated,
      },
      true
    );
    return path.resolve(savedPath);
  } catch (err) {
    logger.warn(
      'Could not read Playwright codegen output file',
      {
        outputFile: outputPath,
        error: String(err),
      },
      true
    );
    return null;
  }
}

/**
 * The Playwright Inspector runs in a separate browser, so closing it does not
 * close this BrowserContext. Resolve when: context closes, browser disconnects,
 * all pages in this context are closed, or SIGINT/SIGTERM triggers browser.close().
 */
function waitForCodegenSessionEnd(context, browser) {
  return new Promise((resolve) => {
    let settled = false;
    let emptyDebounce = null;

    const onSig = () => {
      browser.close().catch(() => {});
    };

    const cleanup = () => {
      if (emptyDebounce) {
        clearTimeout(emptyDebounce);
        emptyDebounce = null;
      }
      process.off('SIGINT', onSig);
      process.off('SIGTERM', onSig);
    };

    const done = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };

    context.once('close', done);
    browser.once('disconnected', done);
    process.once('SIGINT', onSig);
    process.once('SIGTERM', onSig);

    const onMaybeAllPagesClosed = () => {
      if (settled) return;
      try {
        const open = context.pages().filter((p) => !p.isClosed());
        if (open.length === 0) {
          if (emptyDebounce) clearTimeout(emptyDebounce);
          emptyDebounce = setTimeout(done, 600);
        }
      } catch {
        done();
      }
    };

    const attachPage = (p) => {
      p.once('close', onMaybeAllPagesClosed);
    };
    context.on('page', attachPage);
    for (const p of context.pages()) attachPage(p);
  });
}

/**
 * Run Playwright codegen (inspector) with optional network mock and event recording.
 *
 * @param {object} body — request body (url, testName, patterns, mock options, optional codegen options).
 *   Codegen file is rewritten for ftmocks unless body.transformCodegen === false:
 *   - codegenMockDir / mockDir (default ./ftmocks or RELATIVE_MOCK_DIR_FROM_PLAYWRIGHT_DIR)
 *   - codegenFallbackDir / fallbackDir (default public or RELATIVE_FALLBACK_DIR_FROM_PLAYWRIGHT_DIR)
 *   - codegenSaveDir: directory for `${nameToFolder(testName).toLowerCase()}.spec.js` (default: PLAYWRIGHT_DIR/tests if set, else Playwright output dirname)
 *   - parents: optional string[] (same as POST /api/v1/code/save) — nested folders under codegen save dir for the final .spec.js; if null/empty, derived from testCases + selectedTest (same walk as RecordMockOrTest.getParentFolder)
 *   - testCases, selectedTest: optional — used to derive parents when parents is omitted ({ id, parentId?, name } entries)
 *   - codegenStripInitialGoto: if true, remove the first `await page.goto(...)` after injecting initiatePlaywrightRoutes (default false — goto is kept)
 * @param {{ recordMocks?: boolean, recordEvents?: boolean }} [options]
 * @returns {Promise<{ testFilePath: string | null }>} Absolute path to the final .spec.js when one was written; otherwise null.
 */
async function runPlaywrightCodegen(body, options = {}) {
  const recordMocks = options.recordMocks === true;
  const recordEvents =
    options.recordEvents !== undefined
      ? options.recordEvents
      : body.recordEvents !== false;
  let testFilePath = null;
  const url = body.url || '';
  const testName = body.testName;
  const patterns = body.patterns || [];
  const tracesDir = path.join(
    os.tmpdir(),
    `playwright-recorder-trace-${Date.now()}`
  );
  const codegenBasename = testName
    ? `${nameToFolder(testName).toLowerCase()}.spec.js`
    : `codegen-${Date.now()}.spec.js`;
  const codegenOutputPath = body.output
    ? path.resolve(process.cwd(), body.output)
    : path.join(tracesDir, codegenBasename);
  if (!body.output) {
    fs.mkdirSync(tracesDir, { recursive: true });
  }

  if (recordMocks) {
    process.env.recordTest = testName;
    process.env.recordMocks = testName;
  }
  addUrlToProject({ url, patterns });

  const launchOptions = {
    headless: false,
    handleSIGINT: false,
    args: ['--disable-web-security'],
  };
  if (body.channel) launchOptions.channel = body.channel;
  if (body.proxyServer) {
    launchOptions.proxy = { server: body.proxyServer };
    if (body.proxyBypass) launchOptions.proxy.bypass = body.proxyBypass;
  }

  const browser = await chromium.launch(launchOptions);

  try {
    const contextOptions = {
      ...getContextOptionsFromEnv(),
      deviceScaleFactor: os.platform() === 'darwin' ? 2 : 1,
    };
    if (body.loadStorage) contextOptions.storageState = body.loadStorage;
    if (body.ignoreHttpsErrors) contextOptions.ignoreHTTPSErrors = true;

    const timeout = body.timeout ? parseInt(body.timeout, 10) : 0;
    const context = await browser.newContext(contextOptions);
    context.setDefaultTimeout(timeout);
    context.setDefaultNavigationTimeout(timeout);

    if (recordMocks) {
      await attachNetworkMockRecording(context, {
        testName,
        patterns,
        avoidDuplicatesInTheTest: body.avoidDuplicatesInTheTest,
        avoidDuplicatesWithDefaultMocks: body.avoidDuplicatesWithDefaultMocks,
      });
    }

    const launchOptionsForRecorder = { headless: false, tracesDir };
    const contextOptionsForRecorder = { ...contextOptions };
    delete contextOptionsForRecorder.deviceScaleFactor;

    await context._enableRecorder({
      language:
        body.codegenTarget || process.env.PW_LANG_NAME || 'playwright-test',
      launchOptions: launchOptionsForRecorder,
      contextOptions: contextOptionsForRecorder,
      device: body.device,
      saveStorage: body.saveStorage,
      mode: 'recording',
      testIdAttributeName: body.testIdAttribute,
      outputFile: codegenOutputPath,
      handleSIGINT: false,
    });

    let page = context.pages()[0];
    if (!page) page = await context.newPage();
    page.setDefaultTimeout(body.codegenPageTimeout ?? 60000);

    const targetUrl = normalizeCodegenUrl(url);

    if (recordEvents) {
      logger.info('Playwright codegen: event recording enabled');
      await injectEventRecordingScript(page, targetUrl || url || '', {
        recordEvents: true,
        recordScreenshots: !!body.recordScreenshots,
        recordVideos: !!body.recordVideos,
      });
    }

    if (targetUrl) {
      logger.info('Playwright codegen navigating', { url: targetUrl });
      await page.goto(targetUrl);
    }

    await waitForCodegenSessionEnd(context, browser);
  } finally {
    if (recordMocks) {
      process.env.recordMocks = null;
      process.env.recordTest = null;
    }
    if (browser.isConnected()) {
      await browser.close().catch(() => {});
    }
    rewriteCodegenOutputWithFtmocks(codegenOutputPath, body);
    testFilePath = logCodegenOutputFile(codegenOutputPath, body);
  }
  return { testFilePath };
}

/**
 * Run Playwright codegen with network mock and event recording (POST /api/v1/record/playwright/mocks).
 * Same request body as POST /api/v1/record/mocks (recordEvents defaults true).
 */
async function runPlaywrightCodegenWithMocks(body) {
  return runPlaywrightCodegen(body, {
    recordMocks: true,
    recordEvents: body.recordEvents !== false,
  });
}

module.exports = {
  runPlaywrightCodegen,
  runPlaywrightCodegenWithMocks,
  transformPlaywrightCodegenForFtmocks,
};
