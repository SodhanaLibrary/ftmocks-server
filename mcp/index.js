/**
 * MCP stdio server for FtMocks HTTP API (server.js).
 * Env: FTMOCKS_API_BASE_URL or FTMOCKS_SERVER_URL; default http://localhost:${PORT||5000}
 */
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const pkg = require('../package.json');
const { registerFtMocksTools } = require('./tools.js');

async function main() {
  const mcpServer = new McpServer({
    name: 'ftmocks-server',
    version: pkg.version,
  });

  registerFtMocksTools(mcpServer);

  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
