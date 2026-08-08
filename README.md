# FtMocks

**Record browser interactions → auto-generate Playwright, React & Angular tests → run them. No mock server required.**

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
- **React & Angular test generation** — generate React component tests or Angular spec files alongside Playwright e2e tests
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

## Project types & environment variables

FtMocks supports three kinds of projects, selected with `PROJECT_TYPE` in your `ftmocks.env`:

| `PROJECT_TYPE` | Test framework | Generated file | Saved to | Run with |
| --- | --- | --- | --- | --- |
| `playwright` (default) | Playwright | `<test-name>.spec.js` | `PLAYWRIGHT_DIR/tests` | `npx playwright test` |
| `react` | Jest + React Testing Library | `<test-name>.test.js` | `REACT_TESTS_DIR` | `REACT_TEST_COMMAND` (default `npx jest`) |
| `angular` | Jest (jest-preset-angular) | `<test-name>.spec.ts` | `ANGULAR_TESTS_DIR` | `ANGULAR_TEST_COMMAND` (default `npx jest`) |

`PROJECT_TYPE` drives what the **Record** section shows in the UI. For `react` it swaps the Playwright codegen actions for **Generate React Code**; for `angular` it swaps them for **Generate Angular Code** (Jest + Angular TestBed); for `playwright` (or when unset) it keeps the Playwright codegen flow. You can set it — and the variables below — from the **Projects** page (Edit env file) or by hand.

### Common variables

| Variable | Description |
| --- | --- |
| `MOCK_DIR` | Directory holding recorded mocks (relative paths resolve from the env file). **Required.** |
| `PORT` | Port for the FtMocks UI/API. Default `5000`. |
| `PREFERRED_SERVER_PORTS` | JSON array of preferred ports for the standalone mock server, e.g. `[4051]`. |
| `PROJECT_TYPE` | `playwright` (default), `react`, or `angular`. Selects the recording/codegen features described above. |
| `PROJECT_NAME` | Human-friendly label shown for this project in the **Projects** table, instead of the raw env file path. Optional. |

### Playwright projects

| Variable | Description |
| --- | --- |
| `PLAYWRIGHT_DIR` | Playwright project directory (contains `tests/`). Generated specs are saved to `PLAYWRIGHT_DIR/tests` and run with `npx playwright test`. |

### React projects

| Variable | Description |
| --- | --- |
| `REACT_TESTS_DIR` | Directory where generated `*.test.js` files are saved and read (e.g. `../src/tests`). Relative paths resolve from `MOCK_DIR`. |
| `REACT_TEST_COMMAND` | Command used to run a React test. Default `npx jest`. The test file path is appended, and the command runs from the nearest `package.json` directory with `NODE_ENV=test`. Set per project, e.g. `npx react-scripts test --watchAll=false` (CRA) or `npx vitest run` (Vitest). |
| `REACT_APP_FROM_TESTS_DIR` | Import path of the root `App` component, relative to `REACT_TESTS_DIR`. Used in generated tests as `import App from '<REACT_APP_FROM_TESTS_DIR>'`. Default `../App`. |

Example `ftmocks.env` for a React project:

```env
MOCK_DIR=./testMockData
PORT=5000
PROJECT_TYPE=react
REACT_TESTS_DIR=../src/tests
REACT_APP_FROM_TESTS_DIR=../App
```

Generated React tests import their runtime from [`ftmocks-utils`](https://github.com/SodhanaLibrary/ftmocks-utils) (`initiateJestFetch`, `getByXPath`), so the target project must have `ftmocks-utils` (>=1.7.0), `jest`, and `@testing-library/react` installed.

### Angular projects

| Variable | Description |
| --- | --- |
| `ANGULAR_TESTS_DIR` | Directory where generated `*.spec.ts` files are saved and read (e.g. `../src/app/tests`). Relative paths resolve from `MOCK_DIR`. The Angular analogue of `PLAYWRIGHT_DIR`. |
| `ANGULAR_TEST_COMMAND` | Command used to run an Angular test. Default `npx jest` (via [jest-preset-angular](https://github.com/thymikee/jest-preset-angular)). The test file path is appended, and the command runs from the nearest `package.json` directory with `NODE_ENV=test`. |

Example `ftmocks.env` for an Angular project:

```env
MOCK_DIR=./testMockData
PORT=5000
PROJECT_TYPE=angular
ANGULAR_TESTS_DIR=../src/app/tests
```

Generated Angular tests run under Jest (jest-preset-angular): they render the component with Angular `TestBed` and install an FtMocks `HttpClient` interceptor from [`ftmocks-utils`](https://github.com/SodhanaLibrary/ftmocks-utils) (`ftmocksHttpInterceptor`, `getByXPath`). The target project needs `ftmocks-utils` (>=1.7.0), `jest`, and `jest-preset-angular` installed. See [`example/my-project-angular`](example/my-project-angular) for a complete working setup.

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
