# FtMocks

**Record browser interactions → auto-generate Playwright & React tests → run them. No mock server required.**

FtMocks captures real network traffic as you use your app, generates ready-to-run test specs, and embeds the recorded mocks directly into your tests. Your CI pipeline needs zero extra infrastructure.

---

## How it works

1. **Record** — open your app in a real browser, interact with it. FtMocks captures every API call as a mock.
2. **Generate** — Playwright codegen produces a `.spec.js` from your interactions, wired to the recorded mocks.
3. **Run** — execute the test. Mocks are served inline; no running server, no shared state, no flakiness from live APIs.

```bash
npx ftmocks init-playwright-all   # scaffold everything in one command
```

---

## Why FtMocks

| Without FtMocks | With FtMocks |
|---|---|
| Hand-write mocks for every API call | Record once from real traffic |
| Maintain a separate mock server in CI | Mocks travel with the test — no infra |
| Brittle tests that break when APIs change | Re-record in minutes to stay current |
| Write Playwright + mock wiring by hand | Codegen handles both simultaneously |

---

## Quickstart

### 1. Scaffold a new project

```bash
npx ftmocks init-playwright-all
```

This installs Playwright, clones and starts `ftmocks-server`, and creates the project scaffold.

### 2. Start the FtMocks UI

```bash
npm start <absolute path to ftmocks.env>
```

Open `http://localhost:<PORT>/` in your browser.

### 3. Record a test

1. Go to **Tests → Create Test Case**
2. Open the **Record** tab, enter your app's URL and the API patterns to capture
3. Click **Playwright codegen + mocks** — a real browser opens
4. Interact with your app, then close the browser
5. FtMocks drops you into the **Code** tab with a generated `.spec.js` and recorded mocks

### 4. Run it

Click the **play icon** to run headless, or the **gavel icon** for Playwright UI mode. Done.

---

## Features

- **One-step record + codegen** — captures network mocks and generates test code simultaneously
- **Inline mock execution** — tests run against recorded data, not live APIs; no mock server process needed in CI
- **HAR / Postman / Playwright trace import** — bring in mocks from existing recordings
- **React test generation** — generate React component tests alongside Playwright e2e tests
- **Default mocks** — shared fallback responses across all tests in a project
- **AI-assisted mock editing** — edit mock payloads with an LLM (requires `OPENAI_API_KEY`)
- **MCP server** — drive FtMocks from Cursor, Claude, or any MCP-capable agent
- **Version control friendly** — mocks are plain JSON files that diff cleanly

---

## Prerequisites

- Node.js 20+
- npm

---

## Manual setup

```bash
git clone https://github.com/SodhanaLibrary/ftmocks-server.git
cd ftmocks-server
npm install
npx playwright install
```

Create `ftmocks.env`:

```env
MOCK_DIR=./example/my-project/testMockData
PORT=5000
PREFERRED_SERVER_PORTS=[4051]
```

Start:

```bash
npm start ./ftmocks.env
```

---

## Model Context Protocol (MCP)

FtMocks ships an MCP server so AI agents (Cursor, Claude, etc.) can record mocks, generate tests, and run them programmatically.

```bash
npm run mcp
```

**Cursor config:**

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

Available MCP tools (prefix `ftmocks_`): `get_tests`, `create_test`, `create_mock_data`, `upload_har_mockdata`, `record_playwright_mocks`, `start_mock_server`, `switch_project`, and more. See [`mcp/tools.js`](mcp/tools.js) for the full list.

---

## Suppressing noisy logs

Add a `.logIgnore` file in your `MOCK_DIR` — one URL regex per line. Matching requests are silenced in both the mock server and ftmocks-utils output.

```text
# Analytics
https://.*\.google-analytics\.com/.*

# Health checks
/api/health
```

---

## Related

- [ftmocks-utils](https://github.com/SodhanaLibrary/ftmocks-utils) — the companion library that wires recorded mocks into your Playwright tests
- [ftmocks.com](https://www.ftmocks.com) — full documentation

---

## Contributing

Pull requests are welcome.

```bash
git checkout -b feature/my-feature
# make changes
git commit -m 'Add my feature'
git push origin feature/my-feature
# open a PR
```
