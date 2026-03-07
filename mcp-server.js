#!/usr/bin/env node
/**
 * MCP (Model Context Protocol) server for ftmocks-server.
 * Exposes test operations as MCP tools: getTests, deleteTest, updateTest, createTest.
 *
 * Usage: node mcp-server.js [--envfile=path/to/env]
 *
 * Env resolution (from projects.json when MOCK_DIR not set):
 * 1. --envfile=path
 * 2. FTMOCKS_WORKSPACE / WORKSPACE_ROOT - matches project by path
 * 3. First project in projects.json
 *
 * Cursor MCP config (add to .cursor/mcp.json):
 * {
 *   "mcpServers": {
 *     "ftmocks": {
 *       "command": "node",
 *       "args": ["/path/to/ftmocks-server/mcp-server.js"],
 *       "env": {
 *         "MOCK_DIR": "/path/to/your/mocks",
 *         "FTMOCKS_WORKSPACE": "/path/to/workspace"
 *       }
 *     }
 *   }
 * }
 */

const path = require('path');
const fs = require('fs');

/**
 * Resolve env file from projects.json based on context.
 * Resolution order:
 * 1. --envfile=path (explicit)
 * 2. MOCK_DIR already set (from Cursor config)
 * 3. FTMOCKS_WORKSPACE env - match project whose env_file path contains workspace
 * 4. process.cwd() - same matching
 * 5. First project in projects.json (latest/active)
 * 6. my-project.env fallback
 */
function resolveEnvFromContext() {
  const args = process.argv.slice(2);

  // 1. Explicit --envfile=
  const envfileArg = args.find((arg) => arg.startsWith('--envfile='));
  if (envfileArg) {
    const envfile = path.resolve(envfileArg.split('=')[1]);
    if (fs.existsSync(envfile)) return envfile;
  }

  // 2. MOCK_DIR already set by Cursor
  if (process.env.MOCK_DIR) return null;

  const projectsPath = path.resolve(__dirname, 'projects.json');
  if (!fs.existsSync(projectsPath)) return null;

  let projects = [];
  try {
    projects = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));
    if (!Array.isArray(projects) || projects.length === 0) return null;
  } catch (_) {
    return null;
  }

  const workspace =
    process.env.FTMOCKS_WORKSPACE ||
    process.env.WORKSPACE_ROOT ||
    process.cwd();
  const normWs = path.normalize(workspace);

  // 3 & 4. Match by workspace: project whose env_file path contains workspace
  for (const p of projects) {
    const ef = path.normalize(p.env_file || '');
    if (!ef || !p.env_file) continue;
    const absEf = path.isAbsolute(ef) ? ef : path.resolve(__dirname, ef);
    if (
      normWs && absEf &&
      (absEf.startsWith(normWs) || normWs.startsWith(path.dirname(absEf)))
    ) {
      if (fs.existsSync(absEf)) return absEf;
    }
  }

  // 5. First project in projects.json
  const first = projects[0];
  const firstEnv = path.normalize(first?.env_file || '');
  if (firstEnv) {
    const absFirst = path.isAbsolute(firstEnv) ? firstEnv : path.resolve(__dirname, firstEnv);
    if (fs.existsSync(absFirst)) return absFirst;
  }

  return null;
}

function loadEnvFile(envfile) {
  if (!envfile || !fs.existsSync(envfile)) return false;
  const result = require('dotenv').config({ path: envfile });
  if (result?.parsed?.MOCK_DIR) {
    process.env.MOCK_DIR = result.parsed.MOCK_DIR;
    process.env.PREFERRED_SERVER_PORTS = result.parsed.PREFERRED_SERVER_PORTS;
    process.env.PLAYWRIGHT_DIR = result.parsed.PLAYWRIGHT_DIR;
    process.env.FALLBACK_DIR = result.parsed.FALLBACK_DIR;
    if (!path.isAbsolute(process.env.MOCK_DIR)) {
      process.env.MOCK_DIR = path.resolve(path.dirname(envfile), process.env.MOCK_DIR);
    }
    return true;
  }
  return false;
}

// Load env before requiring routes
let envfile = resolveEnvFromContext();
if (envfile) {
  loadEnvFile(envfile);
} else if (!process.env.MOCK_DIR) {
  const fallback = path.resolve(__dirname, 'my-project.env');
  if (fs.existsSync(fallback)) {
    loadEnvFile(fallback);
  }
}
if (!process.env.MOCK_DIR) {
  process.env.MOCK_DIR = path.resolve(__dirname, 'example/my-project/testMockData');
}

const {
  getTests,
  deleteTest,
  updateTest,
  createTest,
} = require('./src/routes/TestRoutes');

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');

function createMockRes() {
  const res = {
    _status: 200,
    _data: null,
    status(code) {
      this._status = code;
      return this;
    },
    json(data) {
      this._data = data;
      return this;
    },
  };
  return res;
}

async function callHandler(handler, req) {
  return new Promise((resolve, reject) => {
    const res = createMockRes();
    const done = () => {
      resolve({ status: res._status, data: res._data });
    };
    const originalJson = res.json.bind(res);
    res.json = function (data) {
      res._data = data;
      done();
      return res;
    };
    handler(req, res).catch(reject);
  });
}

async function main() {
  const server = new McpServer({
    name: 'ftmocks',
    version: '1.0.0',
  });

  server.registerTool(
    'getTests',
    {
      title: 'Get Tests',
      description: 'List all tests from the ftmocks project',
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const { status, data } = await callHandler(getTests, {
          params: {},
          query: {},
          body: {},
        });
        if (status >= 400) {
          return {
            content: [{ type: 'text', text: JSON.stringify(data) }],
            isError: true,
          };
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'deleteTest',
    {
      title: 'Delete Test',
      description: 'Delete a test by ID. Provide testId and test name (from query)',
      inputSchema: z.object({
        testId: z.string().describe('The test ID to delete'),
        testName: z.string().optional().describe('Test name (optional)'),
      }),
    },
    async ({ testId, testName }) => {
      try {
        const { status, data } = await callHandler(deleteTest, {
          params: { id: testId },
          query: { name: testName || '' },
          body: {},
        });
        if (status >= 400) {
          return {
            content: [{ type: 'text', text: JSON.stringify(data) }],
            isError: true,
          };
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(data) }],
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'updateTest',
    {
      title: 'Update Test',
      description: 'Update a test by ID. Provide testId and updated fields (name, mode, parentId)',
      inputSchema: z.object({
        testId: z.string().describe('The test ID to update'),
        name: z.string().optional().describe('New test name'),
        mode: z.string().optional().describe('Test mode'),
        parentId: z.string().optional().describe('Parent folder ID'),
      }),
    },
    async ({ testId, name, mode, parentId }) => {
      try {
        const body = {};
        if (name !== undefined) body.name = name;
        if (mode !== undefined) body.mode = mode;
        if (parentId !== undefined) body.parentId = parentId;
        const { status, data } = await callHandler(updateTest, {
          params: { id: testId },
          query: {},
          body,
        });
        if (status >= 400) {
          return {
            content: [{ type: 'text', text: JSON.stringify(data) }],
            isError: true,
          };
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(data) }],
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'createTest',
    {
      title: 'Create Test',
      description: 'Create a new test or folder. Provide name, type (test or folder), and optional parentId',
      inputSchema: z.object({
        name: z.string().describe('Test or folder name'),
        type: z.enum(['test', 'folder']).default('test').describe('Type: test or folder'),
        parentId: z.string().optional().describe('Parent folder ID if nested'),
      }),
    },
    async ({ name, type, parentId }) => {
      try {
        const body = { name, type, parentId: parentId || null };
        const { status, data } = await callHandler(createTest, {
          params: {},
          query: {},
          body,
        });
        if (status >= 400) {
          return {
            content: [{ type: 'text', text: JSON.stringify(data) }],
            isError: true,
          };
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(data) }],
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('MCP server error:', err);
  process.exit(1);
});
