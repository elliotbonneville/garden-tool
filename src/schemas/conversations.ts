import { z } from "zod";
import { generateUUID } from "../utils/uuid";

// Tool call record
export const ToolCallSchema = z.object({
  name: z.string(),
  input: z.record(z.string(), z.unknown()),
});

export type ToolCall = z.infer<typeof ToolCallSchema>;

// Individual message in a conversation
export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.string().datetime(),
  toolCalls: z.array(ToolCallSchema).optional(),
});

export type Message = z.infer<typeof MessageSchema>;

// A single conversation thread
export const ConversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  messages: z.array(MessageSchema),
});

export type Conversation = z.infer<typeof ConversationSchema>;

// All conversations for a project
export const ConversationsStoreSchema = z.object({
  activeConversationId: z.string().nullable(),
  conversations: z.array(ConversationSchema),
});

export type ConversationsStore = z.infer<typeof ConversationsStoreSchema>;

// Storage key for localStorage
export const CONVERSATIONS_STORAGE_KEY = "garden-assistant-conversations";

// Helper to create a new conversation
export function createConversation(title?: string): Conversation {
  const now = new Date().toISOString();
  return {
    id: generateUUID(),
    title: title || `Chat ${new Date().toLocaleDateString()}`,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

// Helper to generate a title from first user message
export function generateTitle(message: string): string {
  const truncated = message.slice(0, 50);
  return truncated.length < message.length ? `${truncated}...` : truncated;
}
