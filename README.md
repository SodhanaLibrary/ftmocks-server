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

1. Create my-project.env file for your project

2. Create a my-project.env file in the project root.
   ```bash
   MOCK_DIR=./example/my-project/testMockData
   PORT=5000
   PREFERRED_SERVER_PORTS=[4051]
   ```

### Running the Project

To start the project, use:

```bash
npm start my-project
```

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

Tools are registered in `mcp/tools.js` and named with an `ftmocks_` prefix. Each tool corresponds to one or more `/api/v1/…` routes, including:

| Area | Examples |
|------|-----------|
| Tests | List/create/update/delete/duplicate tests; mock list CRUD; per-mock update/delete; variants; reset; reorder tests; move mocks to default mocks |
| File uploads | HAR, Postman export, Playwright trace — for a specific test or for default mocks. MCP accepts **base64** file content plus an optional filename (see tool descriptions). |
| Default mocks | List/create/update/delete mocks and variants; move defaults into tests |
| Environment / projects | Current env snapshot (`/env/project`); projects list; switch/add/remove project; `ignoreForAll` |
| Recorded flow | Recorded events CRUD, reorder, screenshots (responses may be base64 for files) |
| Code | Save generated files under Playwright dir; run test (response can be long streamed-style text) |
| Mock server | Start, restart, or stop the auxiliary mock HTTP server bound to a test |
| API specs | List/get/create/update/delete files under `{MOCK_DIR}/api_specs` |
| Versions | Compare versions; optional server-side `git pull` via `/versions` |
| Browser recording | Endpoints that launch Playwright/browser on the **machine running FtMocks** |
| Crypto / AI | Encrypt/decrypt/list keys; AI-assisted mock editing when configured |

The built-in **FtMocks request logger** (`/api/v1/logs` via `LogRoutes`) and **recorded logs** APIs (`/api/v1/recordedLogs`, `deleteAllLogs`) are intentionally **not** exposed as MCP tools. Use the REST API or UI for those.

### Files

| File | Role |
|------|------|
| `mcp/index.js` | MCP stdio entry; wires `registerFtMocksTools` |
| `mcp/tools.js` | Tool definitions and HTTP mapping |
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
