/**
 * Registers MCP tools that mirror ftmocks-server HTTP routes (server.js).
 */
const { z } = require('zod');
const {
  handleApiResponse,
  handleTextResponse,
  fetchJson,
  fetchMultipart,
  fetchRaw,
  fetchBinaryBase64,
} = require('./http.js');

const jsonUnknown = z.record(z.unknown());
const emptySchema = z.object({});

function registerFtMocksTools(mcpServer) {
  const simpleGets = [
    [
      'ftmocks_get_tests_summary',
      '/api/v1/testsSummary',
      'GET /api/v1/testsSummary',
    ],
    [
      'ftmocks_get_env_project',
      '/api/v1/env/project',
      'GET /api/v1/env/project',
    ],
    ['ftmocks_get_projects', '/api/v1/projects', 'GET /api/v1/projects'],
    [
      'ftmocks_get_versions',
      '/api/v1/versions',
      'GET /api/v1/versions (local vs remote package.json)',
    ],
    ['ftmocks_list_api_specs', '/api/v1/apiSpecs', 'GET /api/v1/apiSpecs'],
    [
      'ftmocks_crypto_list_keys',
      '/api/v1/crypto/listKeys',
      'GET /api/v1/crypto/listKeys',
    ],
    [
      'ftmocks_ai_check_key',
      '/api/v1/ai/checkKeyAvailable',
      'GET /api/v1/ai/checkKeyAvailable',
    ],
    ['ftmocks_get_mock_server', '/api/v1/mockServer', 'GET /api/v1/mockServer'],
    [
      'ftmocks_get_record_status',
      '/api/v1/record/status',
      'GET /api/v1/record/status',
    ],
    [
      'ftmocks_get_record_browser_status',
      '/api/v1/record',
      'GET /api/v1/record',
    ],
  ];
  for (const [tool, path, desc] of simpleGets) {
    mcpServer.registerTool(
      tool,
      { description: desc, inputSchema: emptySchema },
      async () => {
        const out = await fetchJson('GET', path);
        if (out.error) return out.error;
        return handleApiResponse(out.res, `GET ${out.url}`);
      }
    );
  }

  // --- Tests (core set from prior MCP) ---
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
    'ftmocks_get_mock_data',
    {
      description: 'GET /api/v1/tests/:id/mockdata?name=',
      inputSchema: { id: z.string().min(1), name: z.string().min(1) },
    },
    async ({ id, name }) => {
      const out = await fetchJson(
        'GET',
        `/api/v1/tests/${encodeURIComponent(id)}/mockdata`,
        {
          query: { name },
        }
      );
      if (out.error) return out.error;
      return handleApiResponse(out.res, `GET ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_create_mock_data',
    {
      description: 'POST /api/v1/tests/:id/mockdata?name=',
      inputSchema: {
        id: z.string().min(1),
        name: z.string().min(1),
        mockData: jsonUnknown,
      },
    },
    async ({ id, name, mockData }) => {
      const out = await fetchJson(
        'POST',
        `/api/v1/tests/${encodeURIComponent(id)}/mockdata`,
        {
          query: { name },
          body: mockData,
        }
      );
      if (out.error) return out.error;
      return handleApiResponse(out.res, `POST ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_update_test_mocks',
    {
      description: 'PUT /api/v1/tests/:id/mockdata?name=',
      inputSchema: {
        id: z.string().min(1),
        name: z.string().min(1),
        mocks: z.array(jsonUnknown),
      },
    },
    async ({ id, name, mocks }) => {
      const out = await fetchJson(
        'PUT',
        `/api/v1/tests/${encodeURIComponent(id)}/mockdata`,
        {
          query: { name },
          body: mocks,
        }
      );
      if (out.error) return out.error;
      return handleApiResponse(out.res, `PUT ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_delete_test_mocks',
    {
      description: 'DELETE /api/v1/tests/:id/mockdata?name=',
      inputSchema: { id: z.string().min(1), name: z.string().min(1) },
    },
    async ({ id, name }) => {
      const out = await fetchJson(
        'DELETE',
        `/api/v1/tests/${encodeURIComponent(id)}/mockdata`,
        {
          query: { name },
        }
      );
      if (out.error) return out.error;
      return handleApiResponse(out.res, `DELETE ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_delete_single_mock',
    {
      description: 'DELETE /api/v1/tests/:id/mockdata/:mockId?name=',
      inputSchema: {
        id: z.string().min(1),
        mockId: z.string().min(1),
        name: z.string().min(1),
      },
    },
    async ({ id, mockId, name }) => {
      const out = await fetchJson(
        'DELETE',
        `/api/v1/tests/${encodeURIComponent(id)}/mockdata/${encodeURIComponent(mockId)}`,
        { query: { name } }
      );
      if (out.error) return out.error;
      return handleApiResponse(out.res, `DELETE ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_reset_test_mocks',
    {
      description: 'PUT /api/v1/tests/:id/reset — body { name, mockData }',
      inputSchema: {
        id: z.string().min(1),
        name: z.string().min(1),
        mockData: z.array(jsonUnknown),
      },
    },
    async ({ id, name, mockData }) => {
      const out = await fetchJson(
        'PUT',
        `/api/v1/tests/${encodeURIComponent(id)}/reset`,
        {
          body: { name, mockData },
        }
      );
      if (out.error) return out.error;
      return handleApiResponse(out.res, `PUT ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_update_single_mock',
    {
      description:
        'PUT /api/v1/tests/:id/mockdata/:mockId?name= — full mock JSON body',
      inputSchema: {
        id: z.string().min(1),
        mockId: z.string().min(1),
        name: z.string().min(1),
        mock: jsonUnknown,
      },
    },
    async ({ id, mockId, name, mock }) => {
      const out = await fetchJson(
        'PUT',
        `/api/v1/tests/${encodeURIComponent(id)}/mockdata/${encodeURIComponent(mockId)}`,
        { query: { name }, body: mock }
      );
      if (out.error) return out.error;
      return handleApiResponse(out.res, `PUT ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_get_mock_variants',
    {
      description: 'GET /api/v1/tests/:id/mockdata/:mockId/variants?name=',
      inputSchema: {
        id: z.string().min(1),
        mockId: z.string().min(1),
        name: z.string().min(1),
      },
    },
    async ({ id, mockId, name }) => {
      const out = await fetchJson(
        'GET',
        `/api/v1/tests/${encodeURIComponent(id)}/mockdata/${encodeURIComponent(mockId)}/variants`,
        { query: { name } }
      );
      if (out.error) return out.error;
      return handleApiResponse(out.res, `GET ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_create_mock_variants',
    {
      description: 'POST /api/v1/tests/:id/mockdata/:mockId/variants?name=',
      inputSchema: {
        id: z.string().min(1),
        mockId: z.string().min(1),
        name: z.string().min(1),
        variants: z.array(jsonUnknown),
      },
    },
    async ({ id, mockId, name, variants }) => {
      const out = await fetchJson(
        'POST',
        `/api/v1/tests/${encodeURIComponent(id)}/mockdata/${encodeURIComponent(mockId)}/variants`,
        { query: { name }, body: { variants } }
      );
      if (out.error) return out.error;
      return handleApiResponse(out.res, `POST ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_update_mock_variants',
    {
      description: 'PUT /api/v1/tests/:id/mockdata/:mockId/variants?name=',
      inputSchema: {
        id: z.string().min(1),
        mockId: z.string().min(1),
        name: z.string().min(1),
        variants: z.array(jsonUnknown),
      },
    },
    async ({ id, mockId, name, variants }) => {
      const out = await fetchJson(
        'PUT',
        `/api/v1/tests/${encodeURIComponent(id)}/mockdata/${encodeURIComponent(mockId)}/variants`,
        { query: { name }, body: { variants } }
      );
      if (out.error) return out.error;
      return handleApiResponse(out.res, `PUT ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_reorder_tests',
    {
      description:
        'PUT /api/v1/reorderTests — body { newOrder: string[] } test ids',
      inputSchema: { newOrder: z.array(z.string()) },
    },
    async ({ newOrder }) => {
      const out = await fetchJson('PUT', '/api/v1/reorderTests', {
        body: { newOrder },
      });
      if (out.error) return out.error;
      return handleApiResponse(out.res, `PUT ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_move_mock_to_default_mocks',
    {
      description:
        'POST /api/v1/moveMockToDefaultMocks — body { mockIds, testName }',
      inputSchema: {
        mockIds: z.array(z.string()),
        testName: z.string().min(1),
      },
    },
    async (body) => {
      const out = await fetchJson('POST', '/api/v1/moveMockToDefaultMocks', {
        body,
      });
      if (out.error) return out.error;
      return handleApiResponse(out.res, `POST ${out.url}`);
    }
  );

  // --- Multipart uploads ---
  const multipartTest = (tool, pathSuffix, fileField, desc) => {
    mcpServer.registerTool(
      tool,
      {
        description: desc,
        inputSchema: {
          id: z.string().min(1),
          fileBase64: z.string().min(1).describe('File content as base64'),
          fileName: z.string().optional().describe('Original filename'),
          testName: z.string().min(1),
          avoidDuplicates: z.boolean().optional(),
        },
      },
      async ({ id, fileBase64, fileName, testName, avoidDuplicates }) => {
        const fields = { testName };
        if (avoidDuplicates !== undefined)
          fields.avoidDuplicates = String(avoidDuplicates);
        const out = await fetchMultipart(
          'POST',
          `/api/v1/tests/${encodeURIComponent(id)}${pathSuffix}`,
          {
            fields,
            fileField,
            fileBase64,
            fileName,
          }
        );
        if (out.error) return out.error;
        return handleApiResponse(out.res, `POST ${out.url}`);
      }
    );
  };

  multipartTest(
    'ftmocks_upload_test_har',
    '/harMockdata',
    'harFile',
    'POST /api/v1/tests/:id/harMockdata (multipart harFile + testName)'
  );
  multipartTest(
    'ftmocks_upload_test_postman',
    '/postmanMockdata',
    'postmanFile',
    'POST /api/v1/tests/:id/postmanMockdata'
  );
  multipartTest(
    'ftmocks_upload_test_playwright_trace',
    '/playwrightMockdata',
    'traceFile',
    'POST /api/v1/tests/:id/playwrightMockdata (Playwright trace)'
  );

  mcpServer.registerTool(
    'ftmocks_upload_default_har',
    {
      description: 'POST /api/v1/defaultHarMocks (multipart field harFile)',
      inputSchema: {
        fileBase64: z.string().min(1),
        fileName: z.string().optional(),
      },
    },
    async ({ fileBase64, fileName }) => {
      const out = await fetchMultipart('POST', '/api/v1/defaultHarMocks', {
        fileField: 'harFile',
        fileBase64,
        fileName,
      });
      if (out.error) return out.error;
      return handleApiResponse(out.res, `POST ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_upload_default_postman',
    {
      description: 'POST /api/v1/defaultPostmanMocks (multipart postmanFile)',
      inputSchema: {
        fileBase64: z.string().min(1),
        fileName: z.string().optional(),
      },
    },
    async ({ fileBase64, fileName }) => {
      const out = await fetchMultipart('POST', '/api/v1/defaultPostmanMocks', {
        fileField: 'postmanFile',
        fileBase64,
        fileName,
      });
      if (out.error) return out.error;
      return handleApiResponse(out.res, `POST ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_upload_default_playwright_trace',
    {
      description:
        'POST /api/v1/defaultMocks/playwrightUpload (multipart traceFile)',
      inputSchema: {
        fileBase64: z.string().min(1),
        fileName: z.string().optional(),
      },
    },
    async ({ fileBase64, fileName }) => {
      const out = await fetchMultipart(
        'POST',
        '/api/v1/defaultMocks/playwrightUpload',
        {
          fileField: 'traceFile',
          fileBase64,
          fileName,
        }
      );
      if (out.error) return out.error;
      return handleApiResponse(out.res, `POST ${out.url}`);
    }
  );

  // --- Default mocks ---
  mcpServer.registerTool(
    'ftmocks_get_default_mocks',
    { description: 'GET /api/v1/defaultmocks', inputSchema: emptySchema },
    async () => {
      const out = await fetchJson('GET', '/api/v1/defaultmocks');
      if (out.error) return out.error;
      return handleApiResponse(out.res, `GET ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_create_default_mock',
    {
      description:
        'POST /api/v1/defaultmocks?name= — same body as test mock create',
      inputSchema: { name: z.string().min(1), mockData: jsonUnknown },
    },
    async ({ name, mockData }) => {
      const out = await fetchJson('POST', '/api/v1/defaultmocks', {
        query: { name },
        body: mockData,
      });
      if (out.error) return out.error;
      return handleApiResponse(out.res, `POST ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_move_default_mocks_to_tests',
    {
      description:
        'POST /api/v1/moveDefaultmocks — optional body { mockIds: string[] }',
      inputSchema: { mockIds: z.array(z.string()).optional() },
    },
    async ({ mockIds }) => {
      const body = mockIds !== undefined ? { mockIds } : {};
      const out = await fetchJson('POST', '/api/v1/moveDefaultmocks', { body });
      if (out.error) return out.error;
      return handleApiResponse(out.res, `POST ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_delete_default_mock',
    {
      description: 'DELETE /api/v1/defaultmocks/:id',
      inputSchema: { id: z.string().min(1) },
    },
    async ({ id }) => {
      const out = await fetchJson(
        'DELETE',
        `/api/v1/defaultmocks/${encodeURIComponent(id)}`
      );
      if (out.error) return out.error;
      return handleApiResponse(out.res, `DELETE ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_update_default_mock',
    {
      description: 'PUT /api/v1/defaultmocks/:id — full mock JSON',
      inputSchema: { id: z.string().min(1), mock: jsonUnknown },
    },
    async ({ id, mock }) => {
      const out = await fetchJson(
        'PUT',
        `/api/v1/defaultmocks/${encodeURIComponent(id)}`,
        {
          body: mock,
        }
      );
      if (out.error) return out.error;
      return handleApiResponse(out.res, `PUT ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_get_default_mock_variants',
    {
      description: 'GET /api/v1/defaultmocks/:id/variants',
      inputSchema: { id: z.string().min(1) },
    },
    async ({ id }) => {
      const out = await fetchJson(
        'GET',
        `/api/v1/defaultmocks/${encodeURIComponent(id)}/variants`
      );
      if (out.error) return out.error;
      return handleApiResponse(out.res, `GET ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_create_default_mock_variants',
    {
      description: 'POST /api/v1/defaultmocks/:id/variants',
      inputSchema: { id: z.string().min(1), variants: z.array(jsonUnknown) },
    },
    async ({ id, variants }) => {
      const out = await fetchJson(
        'POST',
        `/api/v1/defaultmocks/${encodeURIComponent(id)}/variants`,
        {
          body: { variants },
        }
      );
      if (out.error) return out.error;
      return handleApiResponse(out.res, `POST ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_update_default_mock_variants',
    {
      description: 'PUT /api/v1/defaultmocks/:id/variants',
      inputSchema: { id: z.string().min(1), variants: z.array(jsonUnknown) },
    },
    async ({ id, variants }) => {
      const out = await fetchJson(
        'PUT',
        `/api/v1/defaultmocks/${encodeURIComponent(id)}/variants`,
        {
          body: { variants },
        }
      );
      if (out.error) return out.error;
      return handleApiResponse(out.res, `PUT ${out.url}`);
    }
  );

  // --- Recorded events ---
  mcpServer.registerTool(
    'ftmocks_get_recorded_events',
    {
      description:
        'GET /api/v1/recordedEvents?name= optional (omit for defaultMocks)',
      inputSchema: { name: z.string().optional() },
    },
    async ({ name }) => {
      const query = name !== undefined && name !== '' ? { name } : undefined;
      const out = await fetchJson('GET', '/api/v1/recordedEvents', { query });
      if (out.error) return out.error;
      return handleApiResponse(out.res, `GET ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_post_recorded_event',
    {
      description:
        'POST /api/v1/recordedEvents — uses process.env.recordTest on server for target folder',
      inputSchema: { event: jsonUnknown },
    },
    async ({ event }) => {
      const out = await fetchJson('POST', '/api/v1/recordedEvents', {
        body: event,
      });
      if (out.error) return out.error;
      return handleApiResponse(out.res, `POST ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_delete_recorded_event',
    {
      description: 'DELETE /api/v1/recordedEvents/:id?name=',
      inputSchema: { id: z.string().min(1), name: z.string().optional() },
    },
    async ({ id, name }) => {
      const query = name !== undefined && name !== '' ? { name } : undefined;
      const out = await fetchJson(
        'DELETE',
        `/api/v1/recordedEvents/${encodeURIComponent(id)}`,
        {
          query,
        }
      );
      if (out.error) return out.error;
      return handleApiResponse(out.res, `DELETE ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_update_recorded_event',
    {
      description: 'PUT /api/v1/recordedEvents/:id?name=',
      inputSchema: {
        id: z.string().min(1),
        name: z.string().optional(),
        patch: jsonUnknown,
      },
    },
    async ({ id, name, patch }) => {
      const query = name !== undefined && name !== '' ? { name } : undefined;
      const out = await fetchJson(
        'PUT',
        `/api/v1/recordedEvents/${encodeURIComponent(id)}`,
        {
          query,
          body: patch,
        }
      );
      if (out.error) return out.error;
      return handleApiResponse(out.res, `PUT ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_delete_all_recorded_events',
    {
      description: 'DELETE /api/v1/deleteAllEvents?name=',
      inputSchema: { name: z.string().optional() },
    },
    async ({ name }) => {
      const query = name !== undefined && name !== '' ? { name } : undefined;
      const out = await fetchJson('DELETE', '/api/v1/deleteAllEvents', {
        query,
      });
      if (out.error) return out.error;
      return handleApiResponse(out.res, `DELETE ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_duplicate_recorded_event',
    {
      description:
        'POST /api/v1/recordedEvents/:id/duplicate?name= (test name required)',
      inputSchema: { id: z.string().min(1), name: z.string().min(1) },
    },
    async ({ id, name }) => {
      const out = await fetchJson(
        'POST',
        `/api/v1/recordedEvents/${encodeURIComponent(id)}/duplicate`,
        { query: { name } }
      );
      if (out.error) return out.error;
      return handleApiResponse(out.res, `POST ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_add_empty_recorded_event',
    {
      description: 'POST /api/v1/recordedEvents/:id/emptyEvent?name=',
      inputSchema: { id: z.string().min(1), name: z.string().min(1) },
    },
    async ({ id, name }) => {
      const out = await fetchJson(
        'POST',
        `/api/v1/recordedEvents/${encodeURIComponent(id)}/emptyEvent`,
        { query: { name } }
      );
      if (out.error) return out.error;
      return handleApiResponse(out.res, `POST ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_reorder_recorded_events',
    {
      description:
        'PUT /api/v1/reorderRecordedEvents?name= — body { eventIds: string[] }',
      inputSchema: { name: z.string().min(1), eventIds: z.array(z.string()) },
    },
    async ({ name, eventIds }) => {
      const out = await fetchJson('PUT', '/api/v1/reorderRecordedEvents', {
        query: { name },
        body: { eventIds },
      });
      if (out.error) return out.error;
      return handleApiResponse(out.res, `PUT ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_get_screenshot_file',
    {
      description:
        'GET /api/v1/screenshots?file=&testName= — returns base64 (image/png etc.)',
      inputSchema: {
        file: z.string().min(1),
        testName: z.string().optional(),
      },
    },
    async ({ file, testName }) => {
      const query = { file };
      if (testName !== undefined && testName !== '') query.testName = testName;
      return fetchBinaryBase64('GET', '/api/v1/screenshots', { query });
    }
  );

  // --- Code ---
  mcpServer.registerTool(
    'ftmocks_code_save',
    {
      description: 'POST /api/v1/code/save',
      inputSchema: {
        generatedCode: z.string(),
        fileName: z.string(),
        parents: z.array(z.string()).optional(),
      },
    },
    async (body) => {
      const out = await fetchJson('POST', '/api/v1/code/save', { body });
      if (out.error) return out.error;
      return handleApiResponse(out.res, `POST ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_code_run_test',
    {
      description:
        'POST /api/v1/code/runTest — streams Playwright output (may take long); response is full text',
      inputSchema: {
        testName: z.string().optional(),
        generatedCode: z.string(),
        fileName: z.string(),
        parents: z.array(z.string()).optional(),
        withUI: z.boolean().optional(),
      },
    },
    async (body) => {
      const out = await fetchRaw('POST', '/api/v1/code/runTest', { body });
      if (out.error) return out.error;
      return handleTextResponse(out.res, `POST ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_get_test_snaps',
    {
      description: 'GET /api/v1/testSnaps?name=',
      inputSchema: { name: z.string().min(1) },
    },
    async ({ name }) => {
      const out = await fetchJson('GET', '/api/v1/testSnaps', {
        query: { name },
      });
      if (out.error) return out.error;
      return handleApiResponse(out.res, `GET ${out.url}`);
    }
  );

  // --- Projects ---
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
    'ftmocks_add_project',
    {
      description: 'POST /api/v1/projects — body { project } env path string',
      inputSchema: { project: z.string().min(1) },
    },
    async ({ project }) => {
      const out = await fetchJson('POST', '/api/v1/projects', {
        body: { project },
      });
      if (out.error) return out.error;
      return handleApiResponse(out.res, `POST ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_remove_project',
    {
      description: 'DELETE /api/v1/projects — body { env_file }',
      inputSchema: { env_file: z.string().min(1) },
    },
    async ({ env_file }) => {
      const out = await fetchJson('DELETE', '/api/v1/projects', {
        body: { env_file },
      });
      if (out.error) return out.error;
      return handleApiResponse(out.res, `DELETE ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_ignore_for_all',
    {
      description: 'POST /api/v1/ignoreForAll — body { param, testName? }',
      inputSchema: {
        param: z.string().min(1),
        testName: z.string().optional(),
      },
    },
    async (body) => {
      const out = await fetchJson('POST', '/api/v1/ignoreForAll', { body });
      if (out.error) return out.error;
      return handleApiResponse(out.res, `POST ${out.url}`);
    }
  );

  // --- Mock server lifecycle ---
  mcpServer.registerTool(
    'ftmocks_start_mock_server',
    {
      description: 'POST /api/v1/mockServer — body { testName, port }',
      inputSchema: {
        testName: z.string().min(1),
        port: z.number().int().positive(),
      },
    },
    async ({ testName, port }) => {
      const out = await fetchJson('POST', '/api/v1/mockServer', {
        body: { testName, port },
      });
      if (out.error) return out.error;
      return handleApiResponse(out.res, `POST ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_restart_mock_server',
    {
      description: 'PUT /api/v1/mockServer',
      inputSchema: {
        testName: z.string().min(1),
        port: z.number().int().positive(),
      },
    },
    async ({ testName, port }) => {
      const out = await fetchJson('PUT', '/api/v1/mockServer', {
        body: { testName, port },
      });
      if (out.error) return out.error;
      return handleApiResponse(out.res, `PUT ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_stop_mock_server',
    {
      description: 'DELETE /api/v1/mockServer — body { port }',
      inputSchema: { port: z.number().int().positive() },
    },
    async ({ port }) => {
      const out = await fetchJson('DELETE', '/api/v1/mockServer', {
        body: { port },
      });
      if (out.error) return out.error;
      return handleApiResponse(out.res, `DELETE ${out.url}`);
    }
  );

  // --- API specs ---
  mcpServer.registerTool(
    'ftmocks_get_api_spec',
    {
      description: 'GET /api/v1/apiSpecs/:name',
      inputSchema: { name: z.string().min(1) },
    },
    async ({ name }) => {
      const out = await fetchJson(
        'GET',
        `/api/v1/apiSpecs/${encodeURIComponent(name)}`
      );
      if (out.error) return out.error;
      return handleApiResponse(out.res, `GET ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_create_api_spec',
    {
      description: 'POST /api/v1/apiSpecs — body { name, spec }',
      inputSchema: { name: z.string().min(1), spec: jsonUnknown },
    },
    async ({ name, spec }) => {
      const out = await fetchJson('POST', '/api/v1/apiSpecs', {
        body: { name, spec },
      });
      if (out.error) return out.error;
      return handleApiResponse(out.res, `POST ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_update_api_spec',
    {
      description: 'PUT /api/v1/apiSpecs/:name — body { spec }',
      inputSchema: { name: z.string().min(1), spec: jsonUnknown },
    },
    async ({ name, spec }) => {
      const out = await fetchJson(
        'PUT',
        `/api/v1/apiSpecs/${encodeURIComponent(name)}`,
        {
          body: { spec },
        }
      );
      if (out.error) return out.error;
      return handleApiResponse(out.res, `PUT ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_delete_api_spec',
    {
      description: 'DELETE /api/v1/apiSpecs/:name',
      inputSchema: { name: z.string().min(1) },
    },
    async ({ name }) => {
      const out = await fetchJson(
        'DELETE',
        `/api/v1/apiSpecs/${encodeURIComponent(name)}`
      );
      if (out.error) return out.error;
      return handleApiResponse(out.res, `DELETE ${out.url}`);
    }
  );

  // --- Recording (browser / Playwright on server) ---
  mcpServer.registerTool(
    'ftmocks_record_mocks',
    {
      description:
        'POST /api/v1/record/mocks — launches browser; payload is JSON body sent to API',
      inputSchema: { payload: jsonUnknown },
    },
    async ({ payload }) => {
      const out = await fetchJson('POST', '/api/v1/record/mocks', {
        body: payload,
      });
      if (out.error) return out.error;
      return handleApiResponse(out.res, `POST ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_record_test',
    {
      description: 'POST /api/v1/record/test — launches browser session',
      inputSchema: { payload: jsonUnknown },
    },
    async ({ payload }) => {
      const out = await fetchJson('POST', '/api/v1/record/test', {
        body: payload,
      });
      if (out.error) return out.error;
      return handleApiResponse(out.res, `POST ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_record_stop',
    {
      description: 'POST /api/v1/record/stop',
      inputSchema: emptySchema,
    },
    async () => {
      const out = await fetchJson('POST', '/api/v1/record/stop');
      if (out.error) return out.error;
      return handleApiResponse(out.res, `POST ${out.url}`);
    }
  );

  mcpServer.registerTool(
    'ftmocks_record_browser_close',
    {
      description: 'DELETE /api/v1/record — closes recording browser',
      inputSchema: emptySchema,
    },
    async () => {
      const out = await fetchJson('DELETE', '/api/v1/record');
      if (out.error) return out.error;
      return handleApiResponse(out.res, `DELETE ${out.url}`);
    }
  );
}

module.exports = { registerFtMocksTools };
