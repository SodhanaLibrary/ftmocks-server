const logger = require('./Logger');
const path = require('path');
const fs = require('fs');
const { nameToFolder } = require('./MockUtils');
/**
 * Checks if a given URL path looks like a file (e.g., ends with .js, .png, .css, etc).
 * @param {string} urlPath - The URL path to check (e.g., "/assets/logo.png").
 * @returns {boolean} True if the path appears to be a file, false otherwise.
 */
function getFileExtensions(urlPath) {
  // Match a dot followed by at least one alphanumeric character at the end
  return new URL(urlPath).pathname.match(/\.[a-zA-Z0-9]+$/);
}

/**
 * Checks if a HAR entry is a file-like resource (e.g., images, scripts, stylesheets).
 * @param {object} entry - The HAR entry object.
 * @returns {boolean} True if the entry is file-like, false otherwise.
 */
function isFileLikeHarEntry(entry) {
  if (!entry || !entry.request || !entry.response) return false;

  // List of file-like extensions
  const fileLikeExtensions = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.bmp',
    '.webp',
    '.svg',
    '.js',
    '.css',
    '.ico',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
    '.otf',
    '.map',
    '.mp4',
    '.webm',
    '.ogg',
    '.mp3',
    '.wav',
  ];
  // List of file-like MIME type prefixes
  const fileLikeMimeTypes = [
    'image/',
    'font/',
    'audio/',
    'video/',
    'application/javascript',
    'application/x-javascript',
    'text/javascript',
    'text/css',
  ];

  // Check by URL extension
  let url = entry.request.url || '';
  try {
    // If url is not a string, fallback to empty string
    if (typeof url !== 'string') url = '';
    // If a full URL, extract the pathname
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const { pathname } = new URL(url);
      url = pathname;
    }
  } catch (e) {
    // fallback: use as-is
  }
  const urlLower = url.toLowerCase();
  const isFileLikeByExt = fileLikeExtensions.some((ext) =>
    urlLower.endsWith(ext)
  );

  // Check by response content type
  let isFileLikeByMime = false;
  if (entry.response.headers && Array.isArray(entry.response.headers)) {
    const contentTypeHeader = entry.response.headers.find(
      (h) => h.name && h.name.toLowerCase() === 'content-type'
    );
    if (contentTypeHeader && contentTypeHeader.value) {
      const ct = contentTypeHeader.value.toLowerCase();
      isFileLikeByMime = fileLikeMimeTypes.some((type) => ct.startsWith(type));
    }
  }

  return isFileLikeByExt || isFileLikeByMime;
}

const saveIfItIsFile = async (currentRequest, response, testName, id) => {
  try {
    const urlObj = new URL(currentRequest.url());

    // Check if URL contains file extension like .js, .png, .css etc
    const fileExtMatch = urlObj.pathname.match(/\.[a-zA-Z0-9]+$/);
    // Check mime type if extension is not present
    let fileExt = null;
    if (!fileExtMatch) {
      // Try to get extension from content-type header
      const contentType = response.headers()['content-type'];
      if (contentType) {
        // Map common mime types to extensions
        const mimeToExt = {
          'image/png': '.png',
          'image/jpeg': '.jpg',
          'image/jpg': '.jpg',
          'image/gif': '.gif',
          'image/webp': '.webp',
          'image/svg+xml': '.svg',
          'application/javascript': '.js',
          'application/x-javascript': '.js',
          'text/javascript': '.js',
          'text/css': '.css',
          'font/woff': '.woff',
          'font/woff2': '.woff2',
          'font/ttf': '.ttf',
          'audio/mpeg': '.mp3',
          'audio/wav': '.wav',
          'video/mp4': '.mp4',
          'application/pdf': '.pdf',
        };
        // Remove any charset, etc.
        const mime = contentType.split(';')[0].trim();
        if (mimeToExt[mime]) {
          fileExt = mimeToExt[mime];
        }
      }
    } else {
      fileExt = fileExtMatch[0];
    }
    if (fileExt) {
      logger.debug(`Processing file request: ${urlObj.pathname}`, {
        fileExt,
        testName: testName || 'defaultMocks',
      });

      // Create directory path matching URL structure
      const dirPath = path.join(
        process.env.MOCK_DIR,
        testName ? `test_${nameToFolder(testName)}` : 'defaultMocks',
        '_files'
      );

      // Create directories if they don't exist
      fs.mkdirSync(dirPath, { recursive: true });

      // Save file with original name
      const fileName = `${id}${fileExt}`;
      const filePath = path.join(dirPath, fileName);

      const buffer = await response.body();
      fs.writeFileSync(filePath, buffer);

      logger.info(`File saved successfully: ${fileName}`, {
        originalPath: urlObj.pathname,
        savedPath: filePath,
        fileSize: buffer.length,
      });

      return fileName;
    }
    return false;
  } catch (error) {
    logger.error('Error saving file', {
      error: error.message,
      url: currentRequest.url(),
      testName: testName || 'defaultMocks',
    });
    return false;
  }
};

module.exports = {
  getFileExtensions,
  isFileLikeHarEntry,
  saveIfItIsFile,
};
