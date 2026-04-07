import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const API_URL = process.env.API_BASE_URL || "https://zero-wispy-shadow-3951.fly.dev";

const server = new Server({
  name: "project-substitute",
  version: "1.0.0",
}, {
  capabilities: { tools: {} }
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "start_simulation",
      description: "Registers an agent to start a Toys'R'Us CEO simulation.",
      inputSchema: {
        type: "object",
        properties: {
          agentName: { type: "string", description: "The name of the agent" },
          mode: { type: "string", enum: ["blind", "enlightened"], default: "blind" }
        },
        required: ["agentName"]
      }
    },
    {
      name: "check_simulation_status",
      description: "Checks the status of a running simulation.",
      inputSchema: {
        type: "object",
        properties: {
          runId: { type: "string" }
        },
        required: ["runId"]
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "start_simulation") {
    const res = await fetch(`${API_URL}/v1/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: args.agentName, mode: args.mode })
    });
    return { content: [{ type: "text", text: JSON.stringify(await res.json()) }] };
  }

  if (name === "check_simulation_status") {
    const res = await fetch(`${API_URL}/v1/run/${args.runId}`);
    return { content: [{ type: "text", text: JSON.stringify(await res.json()) }] };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
