const path = require('path');
const fs = require('fs');
const logger = require('../utils/Logger');

const API_SPECS_DIR = 'api_specs';

function getApiSpecsDir() {
  return path.join(process.env.MOCK_DIR, API_SPECS_DIR);
}

function ensureApiSpecsDir() {
  const dir = getApiSpecsDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info('Created api_specs directory', { dir });
  }
  return dir;
}

/** Sanitize name for filename: alphanumeric, underscore, hyphen only */
function sanitizeName(name) {
  if (!name || typeof name !== 'string') return null;
  const sanitized = name.replace(/[^a-zA-Z0-9_-]/g, '_').trim();
  return sanitized || null;
}

function getSpecFilePath(name) {
  const sanitized = sanitizeName(name);
  if (!sanitized) return null;
  return path.join(getApiSpecsDir(), `${sanitized}.json`);
}

/**
 * GET /api/v1/apiSpecs
 * List all API spec files in {MOCK_DIR}/api_specs
 */
const getApiSpecs = async (req, res) => {
  try {
    const dir = getApiSpecsDir();
    if (!fs.existsSync(dir)) {
      return res.status(200).json([]);
    }
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    const specs = files.map((f) => {
      const name = f.replace(/\.json$/, '');
      return { name, filename: f };
    });
    res.status(200).json(specs);
  } catch (error) {
    logger.error('Error listing API specs', { error: error.message });
    res.status(500).json({ error: 'Failed to list API specs' });
  }
};

/**
 * GET /api/v1/apiSpecs/:name
 * Get a single API spec content by name
 */
const getApiSpec = async (req, res) => {
  try {
    const filePath = getSpecFilePath(req.params.name);
    if (!filePath) {
      return res.status(400).json({ error: 'Invalid spec name' });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'API spec not found' });
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const spec = JSON.parse(content);
    const name = path.basename(filePath, '.json');
    res.status(200).json({ name, spec });
  } catch (error) {
    logger.error('Error reading API spec', { name: req.params.name, error: error.message });
    res.status(500).json({ error: 'Failed to read API spec' });
  }
};

/**
 * POST /api/v1/apiSpecs
 * Upload new API spec. Body: { name: string, spec: object } or { name: string, spec: string }
 */
const uploadApiSpec = async (req, res) => {
  try {
    ensureApiSpecsDir();
    const { name, spec } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }
    const filePath = getSpecFilePath(name);
    if (!filePath) {
      return res.status(400).json({ error: 'Invalid spec name' });
    }
    let specObj = spec;
    if (typeof spec === 'string') {
      try {
        specObj = JSON.parse(spec);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON in spec' });
      }
    }
    if (!specObj || typeof specObj !== 'object') {
      return res.status(400).json({ error: 'spec must be a JSON object' });
    }
    fs.writeFileSync(filePath, JSON.stringify(specObj, null, 2), 'utf8');
    const savedName = path.basename(filePath, '.json');
    logger.info('API spec uploaded', { name: savedName });
    res.status(201).json({ name: savedName, message: 'API spec saved' });
  } catch (error) {
    logger.error('Error uploading API spec', { error: error.message });
    res.status(500).json({ error: 'Failed to save API spec' });
  }
};

/**
 * PUT /api/v1/apiSpecs/:name
 * Update existing API spec. Body: { spec: object } or { spec: string }
 */
const updateApiSpec = async (req, res) => {
  try {
    ensureApiSpecsDir();
    const filePath = getSpecFilePath(req.params.name);
    if (!filePath) {
      return res.status(400).json({ error: 'Invalid spec name' });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'API spec not found' });
    }
    const { spec } = req.body;
    if (spec === undefined) {
      return res.status(400).json({ error: 'spec is required' });
    }
    let specObj = spec;
    if (typeof spec === 'string') {
      try {
        specObj = JSON.parse(spec);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON in spec' });
      }
    }
    if (!specObj || typeof specObj !== 'object') {
      return res.status(400).json({ error: 'spec must be a JSON object' });
    }
    fs.writeFileSync(filePath, JSON.stringify(specObj, null, 2), 'utf8');
    const savedName = path.basename(filePath, '.json');
    logger.info('API spec updated', { name: savedName });
    res.status(200).json({ name: savedName, message: 'API spec updated' });
  } catch (error) {
    logger.error('Error updating API spec', { name: req.params.name, error: error.message });
    res.status(500).json({ error: 'Failed to update API spec' });
  }
};

/**
 * DELETE /api/v1/apiSpecs/:name
 * Delete an API spec file
 */
const deleteApiSpec = async (req, res) => {
  try {
    const filePath = getSpecFilePath(req.params.name);
    if (!filePath) {
      return res.status(400).json({ error: 'Invalid spec name' });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'API spec not found' });
    }
    fs.unlinkSync(filePath);
    logger.info('API spec deleted', { name: req.params.name });
    res.status(200).json({ message: 'API spec deleted' });
  } catch (error) {
    logger.error('Error deleting API spec', { name: req.params.name, error: error.message });
    res.status(500).json({ error: 'Failed to delete API spec' });
  }
};

module.exports = {
  getApiSpecs,
  getApiSpec,
  uploadApiSpec,
  updateApiSpec,
  deleteApiSpec,
};
