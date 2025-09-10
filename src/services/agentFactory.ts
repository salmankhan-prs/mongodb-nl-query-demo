import { env } from "../config/env";
import type { AgentQueryResult, MemoryConfig, SessionConfig } from "../types";
import { generateSessionId } from "./prompts";
import { StatefulMongoDBAgent } from "./statefulMongoDBAgent";

// Create a singleton instance of the agent
const agentInstance = new StatefulMongoDBAgent({
  type: env.MEMORY_TYPE as "redis" | "memory",
  connectionString: env.MEMORY_CONNECTION_STRING || env.REDIS_URL,
  ttl: env.SESSION_TTL,
});

export function getMongoDBAgent(): StatefulMongoDBAgent {
  return agentInstance;
}

export async function mongoDbAgentLangChain(
  query: string,
  sessionId?: string,
  userId?: string,
): Promise<AgentQueryResult> {
  console.log("🚀 Starting MongoDB Agent LangChain...");

  const agent = getMongoDBAgent();

  const sessionConfig: SessionConfig = {
    sessionId: sessionId || generateSessionId(userId),
    userId: userId,
  };

  console.log(`📋 Session Config: ${JSON.stringify(sessionConfig, null, 2)}`);

  return await agent.query(query, sessionConfig);
}
