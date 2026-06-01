const fs = require('fs');
const path = require('path');

const SERVED_FILE = '_served.json';

function getServedFilePath(mockFolder) {
  return path.join(mockFolder, SERVED_FILE);
}

function ensureServedFile(mockFolder) {
  const filePath = getServedFilePath(mockFolder);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]', 'utf8');
  }
  return filePath;
}

function loadServedList(mockFolder) {
  const filePath = getServedFilePath(mockFolder);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function loadServedIds(mockFolder) {
  return new Set(loadServedList(mockFolder).map((entry) => entry.id));
}

function writeServedList(mockFolder, list) {
  ensureServedFile(mockFolder);
  fs.writeFileSync(
    getServedFilePath(mockFolder),
    JSON.stringify(list, null, 2)
  );
}

function markMockServed(mockFolder, mockId) {
  const list = loadServedList(mockFolder);
  if (!list.some((entry) => entry.id === mockId)) {
    list.push({ id: mockId });
    writeServedList(mockFolder, list);
  }
}

function unmarkMockServed(mockFolder, mockId) {
  const list = loadServedList(mockFolder).filter(
    (entry) => entry.id !== mockId
  );
  writeServedList(mockFolder, list);
}

function resetServed(mockFolder) {
  writeServedList(mockFolder, []);
}

function removeServed(mockFolder, mockId) {
  unmarkMockServed(mockFolder, mockId);
}

function stripServedFromMock(mockData) {
  if (!mockData || typeof mockData !== 'object') {
    return mockData;
  }
  const { served, ...rest } = mockData;
  return rest;
}

function migrateLegacyServed(mockFolder, mocks) {
  const list = loadServedList(mockFolder);
  const ids = new Set(list.map((entry) => entry.id));
  let changed = false;

  mocks.forEach((mock) => {
    const mockId = mock.id;
    const legacyServed = mock.fileContent?.served === true;
    if (mockId && legacyServed && !ids.has(mockId)) {
      list.push({ id: mockId });
      ids.add(mockId);
      changed = true;
    }
  });

  if (changed) {
    writeServedList(mockFolder, list);
  }
}

function attachServedToMocks(mocks, mockFolder) {
  migrateLegacyServed(mockFolder, mocks);
  const servedIds = loadServedIds(mockFolder);
  mocks.forEach((mock) => {
    if (mock.fileContent) {
      mock.fileContent.served = servedIds.has(mock.id);
    }
  });
  return mocks;
}

function attachServedToMockRecords(mockRecords, mockFolder) {
  migrateLegacyServed(
    mockFolder,
    mockRecords.map((record) => ({ id: record.id, fileContent: record }))
  );
  const servedIds = loadServedIds(mockFolder);
  return mockRecords.map((record) => ({
    ...record,
    served: servedIds.has(record.id),
  }));
}

function handleServedUpdate(mockFolder, mockId, served) {
  if (served === true) {
    markMockServed(mockFolder, mockId);
  } else if (served === false) {
    unmarkMockServed(mockFolder, mockId);
  }
}

module.exports = {
  SERVED_FILE,
  getServedFilePath,
  ensureServedFile,
  loadServedList,
  loadServedIds,
  markMockServed,
  unmarkMockServed,
  resetServed,
  removeServed,
  stripServedFromMock,
  attachServedToMocks,
  attachServedToMockRecords,
  handleServedUpdate,
};
