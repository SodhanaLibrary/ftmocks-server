# My Project (Angular) — School Portal

Angular version of the [`my-project`](../my-project) React example. It is the
same **School Portal** app (Teachers / Students / Subjects CRUD) built with
Angular 18 + Angular Material.

It talks to the exact same API endpoints as the React example
(`http://localhost:4051/api/{teachers,students,subjects}`) and ships the same
`testMockData/`, so the FtMocks mock server serves identical mock data and the
element IDs (`header-menu-*`, `teacher-form-*`, `teacher-<id>-edit-btn`, …) match
the React app for recorded events / test generation.

## Scripts

```bash
npm install
npm start      # ng serve on http://localhost:4050
npm run build  # production build to dist/
npm test       # jest (jest-preset-angular) unit tests
```

Tests run under **Jest** via [jest-preset-angular](https://github.com/thymikee/jest-preset-angular). Specs live in `src/app/tests/` and mock `HttpClient` from the recorded `testMockData/` using `ftmocksHttpInterceptor` from `ftmocks-utils` — see `src/app/tests/teachers.spec.ts`. FtMocks generates these specs into `ANGULAR_TESTS_DIR` (see `ftmocks.env`).

## Using with FtMocks

Point an `ftmocks.env` (or the server's project env) at this project's mock data:

```env
MOCK_DIR=./example/my-project-angular/testMockData
PORT=5000
PROJECT_TYPE=react
```

Then start FtMocks against it. The mock server runs on `:4051` (see
`testMockData/mockServer.config.json`), which is where the app's API calls go.

## Structure

- `src/app/api.service.ts` — HttpClient wrapper for the students/teachers/subjects API.
- `src/app/{teachers,students,subjects}/` — each feature has a container, a form, and a list component (mirrors the React `components/` layout).
- `src/app/app.component.ts` — toolbar + view switcher.
- `testMockData/` — FtMocks mock data, copied verbatim from the React example.
