# FtMocks

## Overview

**FtMocks** is a Node.js application that will simplify your maintainance of mock data.

## Features

- Easy maintanance of mock data for test cases
- Default mock data for all test cases
- Mock server for the test case

## Quickstart with playwright

To quickly set up a new mock project, install Playwright, and clone & start the ftmocks-server, run:

```bash
npx ftmocks init-playwright-all
```

## Setup quickly

To quickly set up ftmocks-server, run:

```bash
npx ftmocks setup
```

## Documentation

- Please visit FtMocks(www.ftmocks.com)

## Getting Started

### Prerequisites

To run this project, ensure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) (version 20 or later)
- [npm](https://www.npmjs.com/) (usually included with Node.js)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/SodhanaLibrary/ftmocks-server.git
   ```

2. Navigate into the project directory:

   ```bash
   cd ftmocks-server
   ```

3. Install dependencies:

   ```bash
   npm i
   ```

4. Install playwright:
   ```bash
   npx playwright install
   ```

### Configuration

1. Create an `ftmocks.env` file for your project

2. Create an `ftmocks.env` file in the project root.
   ```bash
   MOCK_DIR=./example/my-project/testMockData
   PORT=5000
   PREFERRED_SERVER_PORTS=[4051]
   ```

### Suppressing noisy mock-server logs (`.logIgnore`)

The auxiliary mock HTTP server (`mockServer.js`, started via `/api/v1/mockServer` or during recording) logs warnings when no mock matches a request and info/debug lines when serving a file-backed mock response. Playwright tests using [ftmocks-utils](https://github.com/SodhanaLibrary/ftmocks-utils) use the same rules for **missing mock data, falling back** and **response is a file, serving file**.

Add a `.logIgnore` file in your `MOCK_DIR` with one URL regex pattern per line. If a request URL matches any pattern, these logs are skipped:

- **No matching mock found** (mock server)
- **Sending file response** / **File response details** (mock server)
- **missing mock data, falling back** / **response is a file, serving file** (ftmocks-utils / Playwright)

Static asset URLs (`.js`, `.css`, images, fonts, etc.) are already suppressed for missing-mock-style messages.

**Example** (`MOCK_DIR/.logIgnore`):

```text
# Analytics
https://.*\.google-analytics\.com/.*

# Expected unmocked paths
/api/health
```

Lines starting with `#` and blank lines are ignored. Each other line is a JavaScript `RegExp` tested against the full request URL.

### Running the Project

To start the project, use:

```bash
npm start <absolute path to ftmocks.env>
```

## Using the FtMocks UI

Open `http://localhost:<PORT>/` after starting the server (see above).

### Add a project from the UI

1. On the home page (Projects table), click **Add Project**.
2. In **Environment Location**, enter the path to the project's `ftmocks.env` file (e.g. `./example/my-project/ftmocks.env`), then click **Create Project**.
3. Click the new row in the Projects table to switch to it — FtMocks starts serving mocks from that project's `MOCK_DIR`.

### Create a test and record mock data

1. Open the **Tests** tab.
2. In the **Test Cases** sidebar, click the **+** icon (create a folder first with the folder icon if you want to group tests), enter a **Test Case Name**, optionally choose a **Parent Folder**, then click **Create Test Case**.
3. Select the new test and open its **Record** tab.
4. Fill in the **URL** to open and one or more **Patterns** (regexes matching the API calls you want captured as mocks). Leave **Stop mock server** / **Record events** checked unless you have a reason not to.
5. Click **Record Mock Data** — a real, headed browser opens. Use your app there to generate the traffic you want recorded.
6. Click **Stop recording** when done. Captured requests show up as mocks under the **Mocks** tab.

### Run the mock server from the UI

1. Open the **Mock Server** tab.
2. Pick a **Test** from the autocomplete — its recorded mocks will be served.
3. Enter a **Port** (or reuse one from the **Preferred Ports** shown below the field).
4. Click **Run** to start it. While it's running, the button becomes **Update**, letting you switch the test or port without stopping first.
5. Click **Stop** to shut it down.
6. Point your application's API calls at `http://localhost:<port>`.

### Codegen + mock recording (Playwright)

1. From the test's **Record** tab, fill in **URL** / **Patterns** as above.
2. Click **Playwright codegen + mocks** — this opens Playwright's codegen/Inspector window against a real browser while recording matching network traffic as mocks for the test.
3. Interact with the app, then close the codegen browser/Inspector window when finished.
4. The panel switches to the **Code** tab and loads the generated `.spec.js` from disk; the mocks recorded during the session appear under the **Mocks** tab.

Use **Run playwright codegen** (in the Code tab) instead if you only want generated code without recording mocks.

### Execute a test after recording

1. In the test's **Record** tab, open the **Code** tab (this happens automatically right after codegen finishes).
2. Edit the generated spec inline if needed.
3. Click the **play icon** ("Save and Run Test") to save the spec into the Playwright directory and run it headless, or the **gavel icon** ("Save and Run Test With Playwright UI") to run it with the Playwright UI. Output streams live into the panel below.
4. Use the **save icon** to persist the spec without running it, or the **copy icon** to copy the code to your clipboard.

## Model Context Protocol (MCP)

This repository ships an MCP server (`mcp/index.js`) that exposes **tools** mapped to the same HTTP API defined in `server.js`. Any MCP-capable client (for example Cursor) can drive FtMocks programmatically while your FtMocks process is running.

For agent-oriented usage (workflows, quirks, examples), see the Cursor skill at [.cursor/skills/ftmocks-mcp/SKILL.md](.cursor/skills/ftmocks-mcp/SKILL.md).

### Prerequisites

- Node.js 20 or later and `npm install` completed in this repo.
- The FtMocks HTTP API must be reachable (typically `npm start <path-to-envfile>`). The MCP server only forwards HTTP requests; it does not replace `server.js`.

### Environment variables

The MCP process resolves the API base URL in this order:

1. `FTMOCKS_API_BASE_URL` — full origin, e.g. `http://localhost:5000`
2. `FTMOCKS_SERVER_URL` — same meaning as above (alternate name)
3. Fallback: `http://localhost:${PORT}` when `PORT` is set, otherwise `http://localhost:5000`

Set `FTMOCKS_API_BASE_URL` (or `FTMOCKS_SERVER_URL`) in your MCP client config so it matches the host and port where FtMocks listens.

### Running the MCP server

From the repository root:

```bash
npm run mcp
```

This starts a **stdio** MCP server (protocol messages on stdin/stdout). Integrations should not write unrelated data to stdout.

### Cursor configuration example

Adjust paths and port to match your setup:

```json
{
  "mcpServers": {
    "ftmocks": {
      "command": "node",
      "args": ["/absolute/path/to/ftmocks-server/mcp/index.js"],
      "env": {
        "FTMOCKS_API_BASE_URL": "http://localhost:5000"
      }
    }
  }
}
```

### Tools overview

Tools are registered in `mcp/tools.js` and named with an `ftmocks_` prefix. This is the full list — there is no broader hidden set beyond what's below.

**Local setup (no running server required):**

| Tool | CLI equivalent |
|------|----------------|
| `ftmocks_init` | `npx ftmocks init` |
| `ftmocks_init_playwright` | `npx ftmocks init-playwright` |

Optional argument `project_dir` (absolute path) sets where `ftmocks/` and `playwright/` are created; defaults to the MCP process working directory.

**Projects / environment** (requires the FtMocks HTTP API running):

| Tool | Route |
|------|-------|
| `ftmocks_get_projects` | `GET /api/v1/projects` |
| `ftmocks_create_project` | `POST /api/v1/projects` |
| `ftmocks_switch_project` | `PUT /api/v1/projects` |

**Tests and mocks:**

| Tool | Route |
|------|-------|
| `ftmocks_get_tests` | `GET /api/v1/tests` |
| `ftmocks_create_test` | `POST /api/v1/tests` |
| `ftmocks_update_test` | `PUT /api/v1/tests/:id` |
| `ftmocks_delete_test` | `DELETE /api/v1/tests/:id` |
| `ftmocks_get_mock_summary` | `GET /api/v1/tests/:id/mockSummary` |
| `ftmocks_get_mock_data` | `GET /api/v1/tests/:id/mockdata/:mockId` |
| `ftmocks_create_mock_data` | `POST /api/v1/tests/:id/mockdata` |
| `ftmocks_upload_har_mockdata` | `POST /api/v1/tests/:id/harMockdata` (accepts **base64** HAR content plus an optional filename, or an absolute `harFilePath`) |

**Mock server:**

| Tool | Route |
|------|-------|
| `ftmocks_start_mock_server` | `POST /api/v1/mockServer` |
| `ftmocks_stop_mock_server` | `DELETE /api/v1/mockServer` |

**Playwright codegen:**

| Tool | Route |
|------|-------|
| `ftmocks_record_playwright` | `POST /api/v1/record/playwright` — codegen without network mock or event recording |
| `ftmocks_record_playwright_mocks` | `POST /api/v1/record/playwright/mocks` — codegen with network mock recording |

These launch Playwright/a browser on the **machine running FtMocks** and return the generated `.spec.js` path.

**Not exposed as MCP tools** — use the REST API or the FtMocks UI directly for these instead:

- Mock/test variants, reset, reorder tests, duplicate tests, move mocks to/from default mocks
- Default mocks CRUD and Postman/Playwright-trace uploads
- Recorded events (record/replay flow), screenshots, recorded logs (`/api/v1/recordedLogs`)
- Code save/run (`/api/v1/code/save`, `/api/v1/code/runTest`, `/api/v1/code/spec`)
- API specs CRUD under `{MOCK_DIR}/api_specs`
- Version comparison / server-side `git pull` (`/api/v1/versions`)
- Browser recording (`/api/v1/record/mocks`, `/api/v1/record/test`)
- AI-assisted mock editing (`/api/v1/ai/editMockData`, requires `OPENAI_API_KEY`)

### Files

| File | Role |
|------|------|
| `mcp/index.js` | MCP stdio entry; wires `registerFtMocksTools` |
| `mcp/tools.js` | Tool definitions (HTTP mapping + setup tools) |
| `mcp/init.js` | `init` / `init-playwright` scaffolding |
| `mcp/http.js` | Shared `fetch`, multipart/base64 helpers, response formatting |

## About ftmocks-utils

Refer to the [ftmocks-utils](https://github.com/SodhanaLibrary/ftmocks-utils) for detailed API documentation, usage examples, and advanced configuration. This package is essential for wrighting testcases.

### Contributing

Contributions are welcome! Please fork this repository and create a pull request.

1. Fork the Project
2. Create your Feature Branch (git checkout -b feature/AmazingFeature)
3. Commit your Changes (git commit -m 'Add some AmazingFeature')
4. Push to the Branch (git push origin feature/AmazingFeature)
5. Open a Pull Request
