export enum ECollectionNames {
  USERS = "users",
  PRODUCTS = "products",
  ORDERS = "orders",
}

export interface SessionConfig {
  sessionId: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface MemoryConfig {
  type: "redis" | "memory";
  connectionString?: string;
  ttl?: number; // Time to live in seconds
}

export interface AgentQueryResult {
  success: boolean;
  sessionId: string;
  response?: string;
  conversationLength?: number;
  query: string;
  timestamp?: string;
  error?: string;
  isNewSession?: boolean;
}

export interface ConversationHistoryResult {
  success: boolean;
  sessionId?: string;
  messageCount?: number;
  messages?: Array<{
    type: string;
    content: string;
    timestamp: string;
  }>;
  error?: string;
}

export interface ClearSessionResult {
  success: boolean;
  sessionId?: string;
  error?: string;
}

export interface ToolResult {
  success: boolean;
  sessionId: string;
  collection?: string;
  error?: string;
  [key: string]: any;
}

export type SanitizeRules = Record<string, Record<string, any>>;