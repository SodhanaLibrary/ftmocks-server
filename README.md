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

## About ftmocks-utils

Refer to the [ftmocks-utils](https://github.com/SodhanaLibrary/ftmocks-utils) for detailed API documentation, usage examples, and advanced configuration. This package is essential for wrighting testcases.

### Contributing

Contributions are welcome! Please fork this repository and create a pull request.

1. Fork the Project
2. Create your Feature Branch (git checkout -b feature/AmazingFeature)
3. Commit your Changes (git commit -m 'Add some AmazingFeature')
4. Push to the Branch (git push origin feature/AmazingFeature)
5. Open a Pull Request
