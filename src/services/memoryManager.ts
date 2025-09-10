import { RedisChatMessageHistory } from "@langchain/redis";
import { env } from "../config/env";
import type { MemoryConfig } from "../types";
import { BaseMessage } from '@langchain/core/messages';

export class ConversationMemoryManager {
  private memoryConfig: MemoryConfig;

  constructor(config: MemoryConfig) {
    this.memoryConfig = config;
  }

  private async getMessageHistory(sessionId: string) {
    if (this.memoryConfig.type === "redis" && env.REDIS_URL) {
      return new RedisChatMessageHistory({
        config: {
          url: env.REDIS_URL,
        },
        sessionId,
        sessionTTL: this.memoryConfig.ttl || env.SESSION_TTL,
      });
    }

    // Fallback to in-memory storage (not persistent)
    const { InMemoryChatMessageHistory } = await import(
      "@langchain/core/chat_history"
    );
    return new InMemoryChatMessageHistory();
  }

  async getMessages(sessionId: string): Promise<BaseMessage[]> {
    const history = await this.getMessageHistory(sessionId);
    return history.getMessages();
  }

  async addMessage(sessionId: string, message: BaseMessage): Promise<void> {
    const history = await this.getMessageHistory(sessionId);
    await history.addMessage(message);
  }

  async clearSession(sessionId: string): Promise<void> {
    const history = await this.getMessageHistory(sessionId);
    await history.clear();
  }
}
