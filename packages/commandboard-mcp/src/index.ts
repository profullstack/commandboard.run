#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createCommandBoardMcpServer } from "./server.js";

export { createCommandBoardMcpServer } from "./server.js";

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createCommandBoardMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
