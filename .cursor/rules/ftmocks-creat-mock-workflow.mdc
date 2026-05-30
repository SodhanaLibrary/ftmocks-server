# ftmocks-creat-mock-workflow

When the user asks to **add mock data**, **create a mock for a test**, **duplicate or vary an existing mock**, or similar, follow this loop.

## Non-negotiable: MCP only for mock payloads

- **Do not** hand-write JSON fixture files under `MOCK_DIR`, edit `mock_*.json` on disk, or paste invented HTTP payloads to stand up a mock. New mocks must go through **`ftmocks_get_mock_data`** (template) + **`ftmocks_create_mock_data`** (persist).
- **Allowed** after fetching a template: change **`request`** / **`response`** fields to match the user’s scenario (status, headers, body content, query params). Keep the FtMocks mock object shape.
- **Do not** assign **`id`** in **`mockData`** — the server generates a new UUID when creating.

## MCP

- **Server**: `ftmocks-mcp`
- **Before each tool call**: read that tool’s schema under the MCP descriptors folder (required parameters differ per tool). If a descriptor is missing locally, use **`mcp/tools.js`** as source of truth.
- **Prerequisite**: FtMocks HTTP must be running and the correct project must be active. Call **`ftmocks_switch_project`** with **`env_file`** first when the target repo/env is not already loaded (same as other ftmocks workflows).

## Steps (in order)

1. **Identify the test** — From the user’s request, determine the target test by **display name** (and folder context if the name is ambiguous). If unclear, ask before calling MCP.

2. **Resolve test id and exact name** — Call **`ftmocks_get_tests`** (no args). Walk the returned tree and find the leaf (or folder, if the user is adding to a folder’s test) that matches the user’s intent. Record:
   - **`id`**: UUID used on all mock routes for this test.
   - **`name`**: exact display name — required as the **`name`** query param on **`ftmocks_create_mock_data`** (must match character-for-character).

3. **List existing mocks** — Call **`ftmocks_get_mock_summary`** with **`{ "id": "<test id from step 2>" }`**. Response is `_mock_list.json`: an array of summary rows (**`id`**, **`url`**, **`method`**, **`time`**, etc.) — **not** full request/response bodies. Use this to see what is already captured and to pick template mocks.

4. **Decide which mock(s) to use as templates** — Match the user’s need to one or more summary rows (same endpoint, method, or flow step). If the user wants a **new** endpoint with no template, confirm URL/method/expected response with the user; you may still reuse a structurally similar mock from the same test or ask the user to record one first via the test workflow. If multiple new mocks are needed, repeat steps 5–6 per mock.

5. **Fetch full mock payload(s)** — For each chosen template, call **`ftmocks_get_mock_data`** with:
   - **`id`**: test id from step 2
   - **`mockId`**: mock **`id`** from **`ftmocks_get_mock_summary`**

   The response is the full mock object: **`url`**, **`method`**, **`request`**, **`response`**, optional **`time`**, **`ignoreParams`**, **`waitForPrevious`**, etc.

6. **Format `mockData` for create** — Build the body for **`ftmocks_create_mock_data`** from the fetched payload:
   - **Required top-level fields**: **`url`**, **`method`**, **`request`**, **`response`** (see tool schema).
   - **Remove** **`id`** from the object you send (server assigns a new id).
   - **Apply user-driven edits** on top of the template: e.g. change **`response.status`**, **`response.content`** (JSON string), **`response.headers`**, **`request.postData`**, **`request.queryString`**, **`url`** path/query if the scenario requires it.
   - Preserve optional flags when still relevant: **`ignoreParams`**, **`waitForPrevious`**, **`served`**, **`isDuplicate`**, **`time`** (ISO timestamp string if you keep it).
   - Ensure **`request`** includes at least **`headers`** (object), **`queryString`** (array), **`postData`** (object or **`null`**).

   Example shape (illustrative; values come from **`ftmocks_get_mock_data`**, then edited):

   ```json
   {
     "url": "/api/v1/items?page=1",
     "method": "GET",
     "request": {
       "headers": { "Accept": "application/json" },
       "queryString": [{ "name": "page", "value": "1" }],
       "postData": null
     },
     "response": {
       "status": 200,
       "headers": { "Content-Type": "application/json" },
       "content": "{\"items\":[],\"total\":0}"
     }
   }
   ```

7. **Create the mock** — Call **`ftmocks_create_mock_data`** with arguments at the **top level** (not wrapped in **`payload`**):
   - **`id`**: test id from step 2
   - **`name`**: exact test **`name`** from step 2
   - **`mockData`**: formatted object from step 6

   On success the API returns **`{ "message": "Uploaded successfully" }`**. Optionally call **`ftmocks_get_mock_summary`** again to confirm the new row appears.

## Optional checks

- **`ftmocks_get_mock_summary`** — re-list after create to verify count and ids.
- **`ftmocks_start_mock_server`** — if the user wants to exercise the test against the new mock immediately (exact **`testName`** from step 2).

## Do not

- Edit mock files on disk or author **`mock_*.json`** / **`_mock_list.json`** manually.
- Skip reading MCP tool schemas before calling.
- Guess test **`id`** or **`name`** — always take both from **`ftmocks_get_tests`** for the identified test.
- Pass a stale or template **`id`** inside **`mockData`** — creation always assigns a new mock id.
- Omit **`name`** on **`ftmocks_create_mock_data`** or use a name that does not match the test node’s display name.
- Wrap **`ftmocks_create_mock_data`** arguments in **`payload`**; use top-level **`id`**, **`name`**, **`mockData`** per the MCP descriptor.
