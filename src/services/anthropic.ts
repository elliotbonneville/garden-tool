// Anthropic API service for the Garden Assistant with tool use

import { listDocuments, readDocument, searchDocuments } from "./research";

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
}

export interface SendMessageResult {
  content: string;
  toolCalls: ToolCall[];
}

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

interface ContentBlock {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
}

interface AnthropicResponse {
  content: ContentBlock[];
  stop_reason: "end_turn" | "tool_use" | "max_tokens";
}

const SYSTEM_PROMPT = `You are a helpful garden planning assistant for a Back to Eden style raised bed garden in Exeter, Rhode Island (Zone 6b). The garden is 40x40 ft with 12 raised beds designed to feed two families (7 people).

You have access to research documents about the garden AND web search. Use your tools to look up specific information when needed - don't guess about details like costs, dates, or specifications.

Key facts you should know:
- Location: Exeter, RI (USDA Zone 6b)
- Last frost: May 15, First frost: October 15
- Growing season: ~150 days
- Method: Back to Eden with hugelkultur base
- Beds: Galvanized metal raised beds, 17-18" tall

When users ask questions:
1. First check the research documents for project-specific information
2. Use web search for current/external information (suppliers, prices, weather, new techniques)
3. Always cite your sources - document names for research docs, URLs for web results

Keep responses concise and practical. Focus on actionable advice.`;

const TOOLS = [
  {
    name: "list_documents",
    description: "List all available research documents about the garden. Returns document slugs and titles. Use this to discover what information is available.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "read_document",
    description: "Read the full content of a research document by its slug. Use this to get detailed information about a specific topic like 'plan', 'budget-summary', 'crop-recommendations', 'deer-protection', etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        slug: {
          type: "string",
          description: "The document slug (e.g., 'plan', 'budget-summary', 'climate-zone', 'crop-recommendations')",
        },
      },
      required: ["slug"],
    },
  },
  {
    name: "search_documents",
    description: "Search across all research documents for a keyword or phrase. Returns matching documents with snippets. Use this to find information when you're not sure which document contains it.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "The search query (e.g., 'tomatoes', 'frost date', 'budget', 'deer fence')",
        },
      },
      required: ["query"],
    },
  },
];

// Anthropic's native web search tool
const WEB_SEARCH_TOOL = {
  type: "web_search_20250305",
  name: "web_search",
  max_uses: 5,
};

async function executeToolCall(name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "list_documents": {
      const docs = listDocuments();
      return JSON.stringify(docs, null, 2);
    }
    case "read_document": {
      const slug = input.slug as string;
      const content = await readDocument(slug);
      if (content === null) {
        return `Document "${slug}" not found. Use list_documents to see available documents.`;
      }
      // Truncate very long documents
      if (content.length > 8000) {
        return content.slice(0, 8000) + "\n\n[Document truncated - ask about specific sections if you need more]";
      }
      return content;
    }
    case "search_documents": {
      const query = input.query as string;
      const results = await searchDocuments(query);
      if (results.length === 0) {
        return `No documents found matching "${query}". Try a different search term or use list_documents to see available topics.`;
      }
      return JSON.stringify(results, null, 2);
    }
    default:
      return `Unknown tool: ${name}`;
  }
}

export async function sendMessage(
  messages: Message[],
  onToolCall?: (toolCall: ToolCall) => void
): Promise<SendMessageResult> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key not configured. Add VITE_ANTHROPIC_API_KEY to your .env file and restart the dev server.");
  }

  // Convert to Anthropic format
  let anthropicMessages: AnthropicMessage[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Track all tool calls made during this request
  const allToolCalls: ToolCall[] = [];

  // Agentic loop - keep going until we get a final response
  let iterations = 0;
  const maxIterations = 10;

  while (iterations < maxIterations) {
    iterations++;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
        "anthropic-beta": "web-search-2025-03-05",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: [...TOOLS, WEB_SEARCH_TOOL],
        messages: anthropicMessages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${error}`);
    }

    const data: AnthropicResponse = await response.json();

    // Check if we need to handle tool calls
    if (data.stop_reason === "tool_use") {
      // Find all tool use blocks
      const toolUseBlocks = data.content.filter((c) => c.type === "tool_use");

      // Add assistant message with tool calls
      anthropicMessages.push({
        role: "assistant",
        content: data.content,
      });

      // Execute each tool and collect results
      const toolResults: ContentBlock[] = [];
      for (const toolUse of toolUseBlocks) {
        if (toolUse.name && toolUse.input && toolUse.id) {
          // Track the tool call
          const toolCall: ToolCall = {
            name: toolUse.name,
            input: toolUse.input as Record<string, unknown>,
          };
          allToolCalls.push(toolCall);

          // Notify callback if provided
          if (onToolCall) {
            onToolCall(toolCall);
          }

          const result = await executeToolCall(toolUse.name, toolUse.input as Record<string, unknown>);
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: result,
          });
        }
      }

      // Add tool results as user message
      anthropicMessages.push({
        role: "user",
        content: toolResults,
      });

      // Continue the loop to get the next response
      continue;
    }

    // No tool use - extract the final text response
    const textContent = data.content.find((c) => c.type === "text");
    return {
      content: textContent?.text || "",
      toolCalls: allToolCalls,
    };
  }

  throw new Error("Max iterations reached in agent loop");
}
