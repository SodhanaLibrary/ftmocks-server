### Setting up ftmocks-server and running mock server for tests

1. Clone the repository:
   ```sh
   git clone https://github.com/SodhanaLibrary/ftmocks-server.git
   ```
2. Change directory:
   ```sh
   cd ftmocks-server
   ```
3. Install dependencies:
   ```sh
   npm i
   ```
4. Start the server with your environment file:
   ```sh
   npm start <path to env>
   # Example:
   npm start /ftmocks/ftmocks.env
   ```
5. Open the ftmocks-server UI:
   - Open http://localhost:5000/
   - Click on "Tests" tab
   - Click on "+" icon and create new test
   - Click on the "Mock Server" tab
   - Select the test
   - Enter the port number (ex: 6080)
   - Click "Run"
6. Now run your application and direct the api traffic to the mock server port (ex: 6080)
