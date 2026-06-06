import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createCommandBoardMcpServer } from "./server.js";

describe("CommandBoard MCP server", () => {
  it("exposes product resources, tools, and prompts over MCP", async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createCommandBoardMcpServer();
    const client = new Client({ name: "test-client", version: "0.1.0" });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const resources = await client.listResources();
    expect(resources.resources.map((resource) => resource.uri)).toContain("commandboard://tasks");

    const tasks = await client.callTool({ name: "list_tasks", arguments: { board: "/qa" } });
    expect(firstToolText(tasks)).toContain("task_123");

    const created = await client.callTool({
      name: "create_task",
      arguments: {
        title: "Write MCP smoke test",
        description: "Verify the CommandBoard MCP server can create local tasks.",
        board: "/qa",
        budget_amount: 12
      }
    });
    expect(firstToolText(created)).toContain('"ok": true');

    const prompts = await client.listPrompts();
    expect(prompts.prompts.map((prompt) => prompt.name)).toContain("issue-to-task");

    await client.close();
    await server.close();
  });
});

function firstToolText(result: unknown) {
  if (!isRecord(result) || !Array.isArray(result.content)) {
    return "";
  }

  const [first] = result.content;
  return isRecord(first) && first.type === "text" && typeof first.text === "string" ? first.text : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
