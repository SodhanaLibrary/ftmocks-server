---
name: ftmocks-mcp
description: >-
  Drives FtMocks via its MCP server (HTTP API wrappers). Use when the user works
  with ftmocks-server, FtMocks mocks/tests, or asks to create tests, sync mocks,
  switch projects, run a test on the mock server (switch project + start mock server),
  upload HAR/Postman/trace, or automate FtMocks from Cursor.
disable-model-invocation: true
---

# FtMocks MCP

## When this applies

Use MCP **tools** (prefix `ftmocks_`) registered by `mcp/tools.js` to call the same REST API as `server.js`. Do not invent URLs; map user intent to an existing tool name and arguments.

**Setup tools** (`ftmocks_init`, `ftmocks_init_playwright`) run locally and mirror `npx ftmocks init` / `init-playwright`. Pass **`project_dir`** (absolute workspace root) so files are created in the user’s repo, not the MCP server’s cwd. These do **not** require FtMocks HTTP to be running.

**Hard prerequisite (API tools only):** `ftmocks-server` must be running (`npm start <envfile>` or equivalent) and reachable at the base URL configured for the MCP process.

## Switch project before other tools

The FtMocks API keeps **one active project** in process (mock dir, ports, paths from that env). Before calling **any** other `ftmocks_*` tool that should apply to a specific repo or `ftmocks.env`, **first** call **`ftmocks_switch_project`** with **`{ "env_file": "<absolute path to that ftmocks.env>" }`**. Resolve the path from the user, open workspace, or `ftmocks_get_projects` if you need to list known env files.

Do this **before** `get_tests`, creating tests, mock CRUD, uploads, code run, mock server start/stop, etc. The only exceptions are tools that are intentionally global (e.g. listing projects) and you are not about to act on a particular project’s data.

To add an env file to `projects.json` without loading it: **`ftmocks_create_project`** with **`{ "project": "<path to ftmocks.env>" }`** (POST body field name is `project`, not `env_file`).

## Configure the MCP client

1. Point the MCP server at `node <repo>/mcp/index.js` (see `README.md`).
2. Set **`FTMOCKS_API_BASE_URL`** (or **`FTMOCKS_SERVER_URL`**) to the FtMocks origin, e.g. `http://localhost:5000`, matching `PORT` in the project env file.
3. If neither variable is set, the client falls back to `http://localhost:${PORT}` or `http://localhost:5000`.

## Agent workflow (recommended)

**New project with Playwright:** call `ftmocks_init_playwright` with `project_dir` set to the workspace root, then start `ftmocks-server` and use API tools as needed.

1. Confirm FtMocks is up (or tell the user to start it) before calling **API** tools.
2. **Discover state:** `ftmocks_get_tests` (and optionally `ftmocks_get_tests_summary`) before creating or moving items.
3. **Create a folder or test:** `ftmocks_create_test` — use `type: "folder"` for folders; other types create a test with a mock directory under `MOCK_DIR`.
4. **Mocks:** many routes need **both** `id` (path, UUID from tests list) **and** `name` (query, exact display name). Wrong or missing `name` breaks mock routes.
5. **Destructive actions:** duplicate/delete/reorder only after confirming ids and names from `get_tests`.

## API quirks to remember

| Topic                                     | Detail                                                                                                            |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Mock list / CRUD on `/tests/:id/mockdata` | Handlers use **`name` query** = test display name; path `id` must still match the route.                          |
| Duplicate test                            | `ftmocks_duplicate_test` needs **`name`** = source test’s current display name (used when copying folders).       |
| Multipart uploads (HAR, Postman, trace)   | Tools take **`fileBase64`** and optional **`fileName`**; server fields are `harFile`, `postmanFile`, `traceFile`. |
| Code run                                  | `ftmocks_code_run_test` may return **long text** (Playwright output).                                             |
| Screenshots                               | `ftmocks_get_screenshot_file` returns **base64** text in the tool result.                                         |
| Browser/recording tools                   | Start Playwright/browser on the **machine running FtMocks**, not the user’s laptop unless they are the same host. |

## Not exposed via MCP

Request logger (`/api/v1/logs`) and recorded-logs APIs (`/api/v1/recordedLogs`, `deleteAllLogs`) have **no** MCP tools; use REST or the UI.

## Source of truth

- **Tool list and parameters:** `mcp/tools.js`
- **HTTP helpers (JSON, multipart, base64):** `mcp/http.js`
- **End-user setup:** `README.md` → section **Model Context Protocol (MCP)**

## Examples

**List tests, then create a runnable test under a folder**

1. Call `ftmocks_get_tests`; note folder `id` for `parentId` if needed.
2. Call `ftmocks_create_test` with `name`, `type` (not `"folder"`), optional `parentId`.

**Add a mock to an existing test**

1. From `get_tests`, read `id` and exact `name`.
2. Call `ftmocks_create_mock_data` with that `id`, `name`, and `mockData` object matching FtMocks’ mock shape (see API / UI behavior).

**Upload a HAR into a test**

1. Read file as base64 in the agent environment (or user provides base64).
2. Call `ftmocks_upload_test_har` with `id`, `testName`, `fileBase64`, optional `fileName`, optional `avoidDuplicates`.
