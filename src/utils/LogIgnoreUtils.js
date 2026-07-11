const path = require('path');
const fs = require('fs');

/** Path extensions usually served as static assets (bundles, styles, fonts, media). */
const STATIC_ASSET_EXTENSIONS = new Set([
  '.avif',
  '.css',
  '.eot',
  '.gif',
  '.ico',
  '.jpeg',
  '.jpg',
  '.js',
  '.mjs',
  '.cjs',
  '.map',
  '.mp3',
  '.mp4',
  '.ogg',
  '.otf',
  '.pdf',
  '.png',
  '.svg',
  '.ttf',
  '.wasm',
  '.wav',
  '.webm',
  '.webp',
  '.woff',
  '.woff2',
]);

const LOG_IGNORE_FILENAME = '.logIgnore';
const logIgnoreCache = new Map();

function getMockDir() {
  const mockDir = process.env.MOCK_DIR;
  if (!mockDir) {
    return null;
  }
  if (!path.isAbsolute(mockDir)) {
    return path.resolve(process.cwd(), mockDir);
  }
  return mockDir;
}

function parseLogIgnorePatterns(content) {
  const patterns = [];
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    try {
      patterns.push(new RegExp(trimmed));
    } catch (e) {
      console.warn(
        `\x1b[33mInvalid regex in ${LOG_IGNORE_FILENAME}, skipping:\x1b[0m`,
        trimmed,
        e.message
      );
    }
  }
  return patterns;
}

function getLogIgnorePatterns() {
  const mockDir = getMockDir();
  if (!mockDir) {
    return [];
  }
  const filePath = path.join(mockDir, LOG_IGNORE_FILENAME);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const stat = fs.statSync(filePath);
  const cached = logIgnoreCache.get(mockDir);
  if (cached && cached.mtimeMs === stat.mtimeMs) {
    return cached.patterns;
  }
  const patterns = parseLogIgnorePatterns(fs.readFileSync(filePath, 'utf8'));
  logIgnoreCache.set(mockDir, { mtimeMs: stat.mtimeMs, patterns });
  return patterns;
}

function isLikelyStaticAssetUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }
  let pathname;
  try {
    pathname = new URL(url, 'http://localhost').pathname;
  } catch {
    pathname = url.split('?')[0].split('#')[0];
  }
  const ext = path.extname(pathname).toLowerCase();
  return STATIC_ASSET_EXTENSIONS.has(ext);
}

function isUrlInLogIgnore(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }
  return getLogIgnorePatterns().some((pattern) => pattern.test(url));
}

function shouldLogMissingMockData(url) {
  return !isLikelyStaticAssetUrl(url) && !isUrlInLogIgnore(url);
}

/** Build a full URL string for .logIgnore matching from an Express request. */
function getRequestUrl(req) {
  if (!req) {
    return '';
  }
  const host = req.get?.('host') || req.headers?.host || 'localhost';
  const proto =
    req.protocol || (req.socket?.encrypted ? 'https' : 'http');
  const urlPath = req.originalUrl || req.url || '';
  return `${proto}://${host}${urlPath}`;
}

module.exports = {
  shouldLogMissingMockData,
  getRequestUrl,
};
