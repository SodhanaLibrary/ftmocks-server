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

async function handleTextResponse(res, label) {
  const text = await res.text();
  if (!res.ok) {
    return {
      content: [{ type: 'text', text: `HTTP ${res.status} ${label}\n${text}` }],
      isError: true,
    };
  }
  return {
    content: [{ type: 'text', text: `${label}\n${text}` }],
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

async function fetchMultipart(method, path, { query, fields, fileField, fileBase64, fileName }) {
  const url = buildUrl(path, query);
  const form = new FormData();
  if (fields && typeof fields === 'object') {
    for (const [k, v] of Object.entries(fields)) {
      if (v === undefined || v === null) continue;
      form.append(k, typeof v === 'boolean' ? String(v) : String(v));
    }
  }
  if (fileBase64 && fileField) {
    const buf = Buffer.from(fileBase64, 'base64');
    const blob = new Blob([buf]);
    form.append(fileField, blob, fileName || 'upload.bin');
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

/** Plain GET / POST returning raw body (SSE or binary-friendly). */
async function fetchRaw(method, path, { query, body, headers } = {}) {
  const url = buildUrl(path, query);
  const opts = { method, headers: headers || {} };
  if (body !== undefined) {
    opts.headers = { 'Content-Type': 'application/json', ...opts.headers };
    opts.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  try {
    const res = await fetch(url, opts);
    const text = await res.text();
    return { res, url, text };
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

async function fetchBinaryBase64(method, path, { query } = {}) {
  const url = buildUrl(path, query);
  try {
    const res = await fetch(url, { method });
    const buf = Buffer.from(await res.arrayBuffer());
    const b64 = buf.toString('base64');
    const ct = res.headers.get('content-type') || 'application/octet-stream';
    if (!res.ok) {
      return {
        content: [
          {
            type: 'text',
            text: `HTTP ${res.status} GET ${url}\n${b64.slice(0, 200)}…`,
          },
        ],
        isError: true,
      };
    }
    return {
      content: [
        {
          type: 'text',
          text: `${ct};base64,\n${b64}`,
        },
      ],
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: `GET ${url} failed: ${msg}` }],
      isError: true,
    };
  }
}

module.exports = {
  getBaseUrl,
  buildUrl,
  handleApiResponse,
  handleTextResponse,
  fetchJson,
  fetchMultipart,
  fetchRaw,
  fetchBinaryBase64,
};
