const fs = require('fs');
const path = require('path');
const os = require('os');
const { chromium } = require('playwright');
const logger = require('./utils/Logger');
const { addUrlToProject } = require('./utils/projectUtils');
const {
  attachNetworkMockRecording,
  getContextOptionsFromEnv,
} = require('./utils/networkMockRecording');

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

/**
 * Run Playwright codegen (inspector) on a context that also records network mocks
 * the same way as POST /api/v1/record/mocks.
 *
 * @param {object} body — request body (url, testName, patterns, mock options, optional codegen options)
 */
async function runPlaywrightCodegenWithMocks(body) {
  const url = body.url || '';
  const testName = body.testName;
  const patterns = body.patterns || [];
  const tracesDir = path.join(
    os.tmpdir(),
    `playwright-recorder-trace-${Date.now()}`
  );

  process.env.recordTest = testName;
  process.env.recordMocks = testName;
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

    await attachNetworkMockRecording(context, {
      testName,
      patterns,
      avoidDuplicatesInTheTest: body.avoidDuplicatesInTheTest,
      avoidDuplicatesWithDefaultMocks: body.avoidDuplicatesWithDefaultMocks,
    });

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
      outputFile: body.output
        ? path.resolve(process.cwd(), body.output)
        : undefined,
      handleSIGINT: false,
    });

    let page = context.pages()[0];
    if (!page) page = await context.newPage();
    page.setDefaultTimeout(body.codegenPageTimeout ?? 60000);

    const targetUrl = normalizeCodegenUrl(url);
    if (targetUrl) {
      logger.info('Playwright codegen navigating', { url: targetUrl });
      await page.goto(targetUrl);
    }

    await new Promise((resolve) => {
      browser.once('disconnected', resolve);
    });
  } finally {
    process.env.recordMocks = null;
    process.env.recordTest = null;
    if (browser.isConnected()) {
      await browser.close().catch(() => {});
    }
  }
}

module.exports = { runPlaywrightCodegenWithMocks };
