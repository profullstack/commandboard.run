import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createPluginRegistry } from "@logicsrc/plugin-core";
import { coinPayPlugin } from "@logicsrc/plugin-coinpay";
import { sh1ptPlugin } from "@logicsrc/plugin-sh1pt";
import { uGigPlugin } from "@logicsrc/plugin-ugig";
import { validate } from "@logicsrc/validators";

type Board = { path: string; title: string; description: string };
type Task = {
  id: string;
  type: "logicsrc.task";
  version: "0.1";
  title: string;
  description: string;
  board: string;
  creator_did: string;
  status: "open" | "funded" | "submitted" | "completed" | "failed";
  budget?: { amount: number; currency: string };
  agent_allowed: boolean;
  human_allowed: boolean;
};

const boards: Board[] = [
  { path: "/general", title: "General", description: "CommandBoard.run general discussion." },
  { path: "/gigs", title: "Gigs", description: "Paid work, uGig imports, and LogicSRC tasks." },
  { path: "/agents", title: "Agents", description: "Agent registration, runs, and capabilities." },
  { path: "/projects/sh1pt", title: "sh1pt", description: "Project actions, releases, artifacts, and delivery status." }
];

const tasks: Task[] = [
  {
    id: "task_123",
    type: "logicsrc.task",
    version: "0.1",
    title: "Test checkout flow",
    description: "Verify checkout flow across desktop and mobile.",
    board: "/qa",
    creator_did: "anthony.coinpay",
    status: "funded",
    budget: { amount: 25, currency: "USDC" },
    agent_allowed: true,
    human_allowed: true
  }
];

export function createCommandBoardMcpServer() {
  const registry = createPluginRegistry([coinPayPlugin, uGigPlugin, sh1ptPlugin]);
  const server = new McpServer(
    {
      name: "@profullstack/commandboard-mcp",
      version: "0.1.0"
    },
    {
      capabilities: {
        resources: {},
        tools: {},
        prompts: {}
      },
      instructions: "Use this server for CommandBoard.run product workflows. Write tools in this initial server operate on an in-process reference dataset unless the host wires it to a live API."
    }
  );

  server.registerResource(
    "commandboard-boards",
    "commandboard://boards",
    {
      title: "CommandBoard Boards",
      description: "Reference board list for CommandBoard.run.",
      mimeType: "application/json"
    },
    async () => jsonResource("commandboard://boards", { boards })
  );

  server.registerResource(
    "commandboard-tasks",
    "commandboard://tasks",
    {
      title: "CommandBoard Tasks",
      description: "Reference task list for CommandBoard.run.",
      mimeType: "application/json"
    },
    async () => jsonResource("commandboard://tasks", { tasks })
  );

  server.registerResource(
    "commandboard-plugins",
    "commandboard://plugins",
    {
      title: "CommandBoard Plugins",
      description: "Enabled CommandBoard.run plugin status.",
      mimeType: "application/json"
    },
    async () => jsonResource("commandboard://plugins", registry.snapshot())
  );

  server.registerTool(
    "list_boards",
    {
      title: "List Boards",
      description: "Lists CommandBoard.run boards.",
      annotations: { readOnlyHint: true, openWorldHint: false }
    },
    async () => textResult(JSON.stringify({ boards }, null, 2))
  );

  server.registerTool(
    "list_tasks",
    {
      title: "List Tasks",
      description: "Lists CommandBoard.run tasks, optionally filtered by board or status.",
      inputSchema: {
        board: z.string().optional(),
        status: z.enum(["open", "funded", "submitted", "completed", "failed"]).optional()
      },
      annotations: { readOnlyHint: true, openWorldHint: false }
    },
    async ({ board, status }) => {
      const filtered = tasks.filter((task) => (!board || task.board === board) && (!status || task.status === status));
      return textResult(JSON.stringify({ tasks: filtered }, null, 2));
    }
  );

  server.registerTool(
    "get_task",
    {
      title: "Get Task",
      description: "Gets a CommandBoard.run task by id.",
      inputSchema: {
        id: z.string()
      },
      annotations: { readOnlyHint: true, openWorldHint: false }
    },
    async ({ id }) => {
      const task = tasks.find((item) => item.id === id);
      return textResult(JSON.stringify(task ? { task } : { error: "Task not found", id }, null, 2));
    }
  );

  server.registerTool(
    "create_task",
    {
      title: "Create Task",
      description: "Creates a LogicSRC-compatible task in the server's local CommandBoard task list.",
      inputSchema: {
        title: z.string(),
        description: z.string(),
        board: z.string().default("/gigs"),
        creator_did: z.string().default("anthony.coinpay"),
        budget_amount: z.number().optional(),
        budget_currency: z.string().default("USDC"),
        agent_allowed: z.boolean().default(true),
        human_allowed: z.boolean().default(true)
      },
      annotations: { readOnlyHint: false, openWorldHint: false }
    },
    async ({ title, description, board, creator_did, budget_amount, budget_currency, agent_allowed, human_allowed }) => {
      const task: Task = {
        id: `task_${Date.now()}`,
        type: "logicsrc.task",
        version: "0.1",
        title,
        description,
        board,
        creator_did,
        status: "open",
        budget: budget_amount === undefined ? undefined : { amount: budget_amount, currency: budget_currency },
        agent_allowed,
        human_allowed
      };
      const { id: _id, ...taskDocument } = task;
      const validation = validate("task", taskDocument);
      if (!validation.ok) {
        return textResult(JSON.stringify({ ok: false, errors: validation.errors }, null, 2), true);
      }

      tasks.push(task);
      return textResult(JSON.stringify({ ok: true, task }, null, 2));
    }
  );

  server.registerTool(
    "plugin_status",
    {
      title: "Plugin Status",
      description: "Returns enabled CommandBoard.run plugins and capabilities.",
      annotations: { readOnlyHint: true, openWorldHint: false }
    },
    async () => textResult(JSON.stringify(registry.snapshot(), null, 2))
  );

  server.registerPrompt(
    "issue-to-task",
    {
      title: "Issue to CommandBoard Task",
      description: "Prompt template for converting an issue or request into a CommandBoard task.",
      argsSchema: {
        issue: z.string().describe("Issue text, support request, or feature request."),
        board: z.string().optional().describe("Target CommandBoard board path.")
      }
    },
    async ({ issue, board }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Convert this into a CommandBoard.run task using LogicSRC task fields. Target board: ${board ?? "/gigs"}.\n\nIssue:\n${issue}`
          }
        }
      ]
    })
  );

  server.registerPrompt(
    "summarize-board",
    {
      title: "Summarize Board Activity",
      description: "Prompt template for summarizing CommandBoard board activity.",
      argsSchema: {
        board: z.string().describe("Board path to summarize.")
      }
    },
    async ({ board }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Summarize activity for CommandBoard.run board ${board}. Use commandboard://boards and commandboard://tasks as context and call list_tasks if needed.`
          }
        }
      ]
    })
  );

  return server;
}

function jsonResource(uri: string, data: unknown) {
  return {
    contents: [
      {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2)
      }
    ]
  };
}

function textResult(text: string, isError = false) {
  return { isError, content: [{ type: "text" as const, text }] };
}
