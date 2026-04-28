import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import "dotenv/config";

const API_URL = "http://localhost:3002/api/";

const server = new Server(
  {
    name: "delivery-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// --- Handlers de Ferramentas ---

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_data",
        description: "Lista dados do sistema (materiais, cardapio, pedidos, bebidas, motoboy, view_pedidos_andamento).",
        inputSchema: {
          type: "object",
          properties: {
            entidade: { type: "string", enum: ["material", "cardapio", "pedidos", "bebidas", "motoboy", "view_pedidos_andamento"] }
          },
          required: ["entidade"]
        },
      },
      {
        name: "insert_data",
        description: "Gerador de dados.",
        inputSchema: {
          type: "object",
          properties: {
            entidade: { type: "string", enum: ["material", "bebidas", "pedidos", "cardapio"] },
            dados: { type: "object", description: "Objeto com os campos do item" }
          },
          required: ["entidade", "dados"]
        }
      },
      {
        name: "update_data",
        description: "Atualiza um item existente pelo ID.",
        inputSchema: {
          type: "object",
          properties: {
            entidade: { type: "string", enum: ["material", "bebidas", "cardapio", "pedidos"] },
            id: { type: "number" },
            dados: { type: "object" }
          },
          required: ["entidade", "id", "dados"]
        }
      },
      {
        name: "delete_data",
        description: "Exclui um item do sistema pelo ID.",
        inputSchema: {
          type: "object",
          properties: {
            entidade: { type: "string", enum: ["material", "bebidas", "cardapio"] },
            id: { type: "number" }
          },
          required: ["entidade", "id"]
        }
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let url = `${API_URL}${args.entidade}`;
    let method = "GET";
    let body = null;

    if (name === "insert_data") {
      method = "POST";
      body = JSON.stringify(args.dados);
    } else if (name === "update_data") {
      method = "PUT";
      url = `${url}/${args.id}`;
      body = JSON.stringify(args.dados);
    } else if (name === "delete_data") {
      method = "DELETE";
      url = `${url}/${args.id}`;
    }

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body
    });

    if (!response.ok) {
      throw new Error(`Erro na API (${response.status}): ${response.statusText}`);
    }

    const data = await response.json();

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  } catch (err) {
    return {
      content: [{ type: "text", text: `Erro: ${err.message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("MCP Server CRUD de Delivery rodando via STDIO");
