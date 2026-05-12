/**
 * Registers MCP tools that mirror ftmocks-server HTTP routes (server.js).
 */
const { z } = require('zod');
const { handleApiResponse, fetchJson } = require('./http.js');

const emptySchema = z.object({});

function registerFtMocksTools(mcpServer) {
  mcpServer.registerTool(
    'ftmocks_switch_project',
    {
      description: 'PUT /api/v1/projects — body { env_file }',
      inputSchema: { env_file: z.string().min(1) },
    },
    async ({ env_file }) => {
      const out = await fetchJson('PUT', '/api/v1/projects', {
        body: { env_file },
      });
      if (out.error) return out.error;
      return handleApiResponse(out.res, `PUT ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_get_projects',
    { description: 'GET /api/v1/projects', inputSchema: emptySchema },
    async () => {
      const out = await fetchJson('GET', '/api/v1/projects');
      if (out.error) return out.error;
      return handleApiResponse(out.res, `GET ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_get_tests',
    { description: 'GET /api/v1/tests', inputSchema: emptySchema },
    async () => {
      const out = await fetchJson('GET', '/api/v1/tests');
      if (out.error) return out.error;
      return handleApiResponse(out.res, `GET ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_create_test',
    {
      description: 'POST /api/v1/tests',
      inputSchema: {
        name: z.string().min(1),
        type: z.string().min(1),
        parentId: z.string().optional(),
      },
    },
    async ({ name, type, parentId }) => {
      const payload = { name, type };
      if (parentId !== undefined && parentId !== '')
        payload.parentId = parentId;
      const out = await fetchJson('POST', '/api/v1/tests', { body: payload });
      if (out.error) return out.error;
      return handleApiResponse(out.res, `POST ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_delete_test',
    {
      description: 'DELETE /api/v1/tests/:id',
      inputSchema: { id: z.string().min(1) },
    },
    async ({ id }) => {
      const out = await fetchJson(
        'DELETE',
        `/api/v1/tests/${encodeURIComponent(id)}`
      );
      if (out.error) return out.error;
      return handleApiResponse(out.res, `DELETE ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_update_test',
    {
      description: 'PUT /api/v1/tests/:id',
      inputSchema: {
        id: z.string().min(1),
        name: z.string().optional(),
        mode: z.string().optional(),
        parentId: z.union([z.string(), z.null()]).optional(),
      },
    },
    async ({ id, name, mode, parentId }) => {
      const body = {};
      if (name !== undefined) body.name = name;
      if (mode !== undefined) body.mode = mode;
      if (parentId !== undefined) body.parentId = parentId;
      const out = await fetchJson(
        'PUT',
        `/api/v1/tests/${encodeURIComponent(id)}`,
        { body }
      );
      if (out.error) return out.error;
      return handleApiResponse(out.res, `PUT ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_duplicate_test',
    {
      description: 'POST /api/v1/tests/:id/duplicate?name=',
      inputSchema: { id: z.string().min(1), name: z.string().min(1) },
    },
    async ({ id, name }) => {
      const out = await fetchJson(
        'POST',
        `/api/v1/tests/${encodeURIComponent(id)}/duplicate`,
        {
          query: { name },
        }
      );
      if (out.error) return out.error;
      return handleApiResponse(out.res, `POST ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_record_playwright_mocks',
    {
      description:
        'POST /api/v1/record/playwright/mocks — Playwright codegen with network mock recording (same body as record/mocks: url, patterns, testName, mock server flags, recordEvents, parents, etc.). Response includes testFilePath (absolute path to the generated .spec.js, or null if none).',
      inputSchema: {
        url: z.string(),
        patterns: z.array(z.string()),
        avoidDuplicatesWithDefaultMocks: z.boolean(),
        stopMockServer: z.boolean(),
        startMockServer: z.boolean(),
        recordEvents: z.boolean(),
        testName: z.string().min(1),
        avoidDuplicatesInTheTest: z.boolean(),
        parents: z.array(z.string()),
      },
    },
    async (body) => {
      const out = await fetchJson('POST', '/api/v1/record/playwright/mocks', {
        body,
      });
      if (out.error) return out.error;
      return handleApiResponse(out.res, `POST ${out.url}`);
    }
  );
}

module.exports = { registerFtMocksTools };
