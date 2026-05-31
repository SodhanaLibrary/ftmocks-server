# ftmocks-playwright-mcp-test-workflow

When the user asks to run the **Playwright MCP ftmocks test workflow**, **record a mock test with Playwright MCP**, **capture mocks from a Playwright trace**, or similar, follow this loop.

## Non-negotiable: Playwright MCP for recording; FtMocks MCP for mocks

- **Do not** use **`ftmocks_record_playwright_mocks`** or **`ftmocks_record_playwright`** for the recording session in this workflow — the browser session is driven by **Playwright MCP** (`playwright` / `playwright-test` server).
- **Do not** copy an existing Playwright spec, duplicate a sibling test’s structure, or scaffold a new test by hand to “match” another file before recording.
- **Do not** invent, paste, or manually edit JSON/HTTP fixtures, mock responses, or “sample” API payloads. Captured mocks must come from uploading the recorded **Playwright trace** via FtMocks MCP (step 4), not author-written data.
- **Allowed** after recording: **minimal** fixes in the **generated** spec (steps 5–7) and lint/Prettier (step 8), as described below.

## MCP

- **FtMocks**: `ftmocks-mcp` — project switch, test tree, trace mock upload, optional mock summary checks.
- **Browser / recording**: Playwright MCP — read each tool’s schema under that server’s MCP descriptors folder before calling. Typical tools: **`browser_navigate`**, **`browser_snapshot`**, **`browser_click`**, **`browser_type`**, **`browser_select_option`**, **`browser_start_tracing`**, **`browser_stop_tracing`**, and (when generating a spec from the session) **`generator_setup_page`**, **`generator_read_log`**, **`generator_write_test`**.
- **Before each FtMocks tool call**: read that tool’s schema under the MCP descriptors folder (required parameters differ per tool). If a descriptor is missing locally, use **`mcp/tools.js`** as source of truth.
- **Projects list tool**: Usually **`ftmocks_get_env_projects`**; your MCP may expose the same capability under another name (e.g. **`get_env_projects`**). Use the tool name from the descriptor; the response is an array of objects with **`env_file`**, **`urls`**, and **`patterns`** as in step 1.

## Steps (in order)

1. **Select project** (two calls; read each tool’s schema first):
   - **`ftmocks_get_env_projects`** — returns an array of project rows. Each row includes:
     - **`env_file`**: absolute path to that project’s `ftmocks.env` (pass this to `ftmocks_switch_project`).
     - **`urls`**: string array of app entry URLs (see step 3 for recording).
     - **`patterns`**: string array of network patterns for mock filtering (informational for trace upload; server applies its own filters when processing the trace).
   - **`ftmocks_switch_project`** — pass **`env_file`** from the **same row** the user chose (match path segment for the selected sample project, tree folder like `ui_sanity_admin`, or ask if ambiguous). Keep that row in hand for step 3; do not invent `env_file` or **`url`** when this response has them.

2. **Create the test node** — After the project is active, call **`ftmocks_get_tests`** (read its schema; no args) to load the current test tree. Use that response to choose the parent folder’s id and to match sibling nodes’ **`type`** values when calling **`ftmocks_create_test`**:
   - `name`: human-readable test name; must be **unique** among test nodes in this project (scan the `ftmocks_get_tests` tree for an existing leaf or folder with the same `name`; pick a new name if it collides). It must exactly match the **`testName`** you pass when uploading mocks (step 4) and the Playwright test title after conversion (step 5).
   - `type`: required by the API; use `folder` for folders. For leaf tests, use the same `type` as sibling leaves in the `ftmocks_get_tests` payload (many trees use `testcase` for runnable tests).
   - `parentId`: optional UUID for the parent folder in the ftmocks tree (take from the relevant folder node in `ftmocks_get_tests`).

   Record the new test’s **`id`** and exact **`name`** from the create response or a follow-up **`ftmocks_get_tests`** call.

3. **Record the flow with Playwright MCP** — Drive the app in a traced browser session and produce a Playwright spec.

   **`url`** — take from the **same** `ftmocks_get_env_projects` row you used in step 1: pick **one** string from **`urls`** — prefer a local dev entry with **`http://` or `https://`** and **`localhost`** (often the first such item). For a deep link or staging, use that exact string from **`urls`**; add a scheme only if the browser requires it. If nothing in **`urls`** is usable, ask the user.

   **Recording sequence** (read Playwright MCP schemas first):
   1. **`browser_navigate`** to the chosen **`url`**.
   2. **`browser_start_tracing`** — start trace capture **before** user-visible interactions so network is recorded.
   3. Perform the scenario with Playwright MCP tools (`browser_click`, `browser_type`, `browser_select_option`, etc.) while the user directs or confirms steps. Use **`browser_snapshot`** when you need the accessibility tree to pick targets.
   4. **`browser_stop_tracing`** — stop tracing and note the returned trace artifact path(s) (often a `.trace` file and related files under a traces directory). Keep the **absolute path(s)** for step 4.

   **Generate the Playwright spec** from the same session (pick one approach; prefer generator tools when available):
   - **Generator path**: **`generator_setup_page`** (if not already set up) → replay steps with browser tools → **`generator_read_log`** → **`generator_write_test`** with a single test whose title matches the ftmocks test **`name`** from step 2 and a filename like `{nameToFolder(name).toLowerCase()}.spec.js`.
   - **Manual path**: if generator tools are unavailable, build a minimal `@playwright/test` spec that mirrors the steps you executed (one `test(...)` block, same title as step 2 **`name`**). Do **not** add `initiatePlaywrightRoutes` yet — that happens in step 5.

   Wait until the user finishes the recorded session, you have trace path(s), and a draft spec (file path or source string).

4. **Upload trace mocks** — Package and upload the trace so FtMocks generates mock JSON under the test’s mock folder.

   **Package the trace** — The FtMocks server expects a **Playwright trace archive** (zip). If **`browser_stop_tracing`** returns loose files (e.g. `trace-*.trace`, `trace-*.network`, optional `resources/`), zip the trace directory contents into one **`.zip`** file on disk and keep its absolute path. Use a `.zip` filename such as `{nameToFolder(testName).toLowerCase()}-trace.zip`.

   **Upload** — Call **`ftmocks_upload_har_mockdata`** with arguments at the **top level** (read the tool schema first):
   - **`id`**: test **`id`** from step 2
   - **`testName`**: exact same string as the ftmocks test leaf **`name`** from step 2
   - **`avoidDuplicates`**: optional (default `true`); set `false` only when the user wants every captured request kept
   - **`harFilePath`**: absolute path to the trace **`.zip`** on disk, **or** **`harFileBase64`** + **`harFileName`** (e.g. `my-test-trace.zip`) when the file is not on the agent’s filesystem

   Example (illustrative):

   ```json
   {
     "id": "<test id from step 2>",
     "testName": "Traffic Mirroring",
     "avoidDuplicates": true,
     "harFilePath": "/tmp/traffic-mirroring-trace.zip"
   }
   ```

   On success the API updates the test’s mock data. Optionally call **`ftmocks_get_mock_summary`** with the test **`id`** to confirm mocks were created.

   If upload fails with a HAR parse error, the server may require the Playwright trace endpoint instead (`POST /api/v1/tests/:id/playwrightMockdata`, multipart **`traceFile`**) — use the matching MCP tool from **`mcp/tools.js`** if present, with the same **`id`**, **`testName`**, and zip. Do **not** hand-author mock JSON instead.

5. **Convert the generated spec into an ftmocks mock test** — Rewrite the draft Playwright spec into the ftmocks pattern (same transform as `transformPlaywrightCodegenForFtmocks` in **`src/playwrightCodegenWithMocks.js`**):

   - Add `import { initiatePlaywrightRoutes } from 'ftmocks-utils';` if missing.
   - Set the `test(...)` title to the exact ftmocks test **`name`** from step 2.
   - Remove any `test.use({ ... });` blocks injected by codegen.
   - At the start of the test body (before other steps, after any leading `page.goto` you keep), inject:

     ```js
     await initiatePlaywrightRoutes(
       page,
       {
         MOCK_DIR: './ftmocks', // or RELATIVE_MOCK_DIR_FROM_PLAYWRIGHT_DIR from the project
         FALLBACK_DIR: 'public', // or RELATIVE_FALLBACK_DIR_FROM_PLAYWRIGHT_DIR
       },
       '<exact test name from step 2>'
     );
     ```

   - Save the file under the project’s Playwright **`tests/`** tree, mirroring ftmocks folder **`parents`** from the test node (same layout as **`ftmocks_record_playwright_mocks`** / POST **`/api/v1/code/save`**). Filename: `{nameToFolder(name).toLowerCase()}.spec.js`. Record the **absolute `testFilePath`**.

   **Allowed edits here:** only what is required for the ftmocks mock-test shape (imports, `initiatePlaywrightRoutes`, test title, save location) — not new scenario steps or invented assertions.

6. **Run the test** — When **`testFilePath`** is known, run Playwright headlessly against that file. **Execute** the command in the shell (working directory = Playwright package root as below); report pass/fail output:

   ```bash
   npx playwright test <file path> --headless
   ```

   Run from the **directory that owns the Playwright config** for that repo (usually the package root next to `playwright.config.*` / the `package.json` that depends on `@playwright/test`). If **`testFilePath`** is unknown, skip this step and report that the spec path is missing.

   **If the run fails** (non-zero exit, test failures, or compile errors): read the Playwright / stack traces, apply **minimal** fixes in the generated spec or directly related test helpers, then **run the same command again**. Repeat **fix → `npx playwright test … --headless`** until the run succeeds. If failure is environmental (app not running, missing secrets, wrong CWD) or needs product clarification, stop and tell the user what is blocking instead of guessing.

7. **Lint and format the spec** — After step 6 succeeds, same **package root** as step 6. **Execute** the repo’s tooling on that file (read `package.json` for scripts such as `lint` / `eslint` / `prettier` if they accept a path). If there is no file-scoped script, use:

   ```bash
   npx prettier --write <file path>
   npx eslint <file path>
   ```

   Use the **absolute** **`testFilePath`** in place of `<file path>` (quote if needed). Add `--fix` to ESLint when that matches the project’s usual practice. Resolve any remaining lint issues in the spec with **minimal** edits, then re-run lint/Prettier on the file until clean.

## Optional checks

- **`ftmocks_get_env_projects`** — re-list rows if you need to re-check **`urls`** / **`env_file`** after switching.
- **`ftmocks_get_mock_summary`** — confirm mock count after trace upload.
- **`ftmocks_start_mock_server`** — if the user wants to exercise the app against the new mocks before or after the headless run (exact **`testName`** from step 2).

## Do not

- Use **`ftmocks_record_playwright_mocks`** or **`ftmocks_record_playwright`** for the recording step in this workflow — use Playwright MCP instead.
- Duplicate an existing test or author a new spec from scratch without recording; do not hand-write mock payloads or fixture files — use only the trace upload in **step 4** for mocks.
- Skip reading MCP tool schemas before calling (both Playwright MCP and FtMocks MCP).
- Guess **`env_file`**, recording **`url`**, test **`id`**, or **`testName`** instead of taking them from **`ftmocks_get_env_projects`** / **`ftmocks_get_tests`** when those tools are available.
- Wrap FtMocks tool arguments in **`payload`**; use top-level fields per each MCP descriptor.
- Give a new test the same **`name`** / **`testName`** as another node already present in the **`ftmocks_get_tests`** tree for that project.
- Call **`browser_stop_tracing`** before finishing the scenario — mocks will be incomplete.
- Skip the **`initiatePlaywrightRoutes`** conversion in step 5 — the headless run must use ftmocks mock routing, not live backend calls alone.
