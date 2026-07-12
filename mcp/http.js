const fs = require('fs');
const pathMod = require('path');

function getBaseUrl() {
  const raw =
    process.env.FTMOCKS_API_BASE_URL ||
    process.env.FTMOCKS_SERVER_URL ||
    `http://localhost:${process.env.PORT || 5000}`;
  return raw.replace(/\/$/, '');
}

function buildUrl(path, query) {
  const base = getBaseUrl();
  const rel = path.startsWith('/') ? path : `/${path}`;
  const u = new URL(rel, `${base}/`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') {
        u.searchParams.set(k, String(v));
      }
    }
  }
  return u.href;
}

async function handleApiResponse(res, label) {
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text };
  }
  const formatted = JSON.stringify(parsed, null, 2);
  if (!res.ok) {
    return {
      content: [{ type: 'text', text: `HTTP ${res.status} ${label}\n${formatted}` }],
      isError: true,
    };
  }
  return {
    content: [{ type: 'text', text: `${label}\n${formatted}` }],
  };
}

async function fetchJson(method, path, { query, body } = {}) {
  const url = buildUrl(path, query);
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) {
    opts.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  try {
    const res = await fetch(url, opts);
    return { res, url };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      error: {
        content: [
          {
            type: 'text',
            text: `${method} ${url} failed: ${msg}. Is ftmocks-server running?`,
          },
        ],
        isError: true,
      },
    };
  }
}

async function fetchMultipart(
  method,
  path,
  { query, fields, fileField, filePath, fileBase64, fileName }
) {
  const url = buildUrl(path, query);
  const form = new FormData();
  if (fields && typeof fields === 'object') {
    for (const [k, v] of Object.entries(fields)) {
      if (v === undefined || v === null) continue;
      form.append(k, typeof v === 'boolean' ? String(v) : String(v));
    }
  }
  if (fileField) {
    let buf;
    let uploadName = fileName || 'upload.bin';
    if (filePath) {
      if (!fs.existsSync(filePath)) {
        return {
          error: {
            content: [{ type: 'text', text: `File not found: ${filePath}` }],
            isError: true,
          },
        };
      }
      buf = fs.readFileSync(filePath);
      if (!fileName) uploadName = pathMod.basename(filePath);
    } else if (fileBase64) {
      buf = Buffer.from(fileBase64, 'base64');
    }
    if (buf) {
      const blob = new Blob([buf]);
      form.append(fileField, blob, uploadName);
    }
  }
  try {
    const res = await fetch(url, { method, body: form });
    return { res, url };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      error: {
        content: [{ type: 'text', text: `${method} ${url} failed: ${msg}` }],
        isError: true,
      },
    };
  }
}

module.exports = {
  handleApiResponse,
  fetchJson,
  fetchMultipart,
};
