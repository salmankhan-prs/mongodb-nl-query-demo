import { type AIMessage, HumanMessage } from "@langchain/core/messages";
import type {
  AgentQueryResult,
  ClearSessionResult,
  ConversationHistoryResult,
  MemoryConfig,
  SessionConfig,
} from "../types";
import { type AgentStateType, agentWorkflow } from "./agentState";
import { ConversationMemoryManager } from "./memoryManager";

export class StatefulMongoDBAgent {
  private memoryManager: ConversationMemoryManager;
  private agent: any;

  constructor(memoryConfig: MemoryConfig) {
    this.memoryManager = new ConversationMemoryManager(memoryConfig);
    this.agent = agentWorkflow.createGraph();
  }

  async query(input: string, sessionConfig: SessionConfig): Promise<AgentQueryResult> {
    try {
      const { sessionId, userId, metadata } = sessionConfig;

      console.log(`🔍 Processing query for session: ${sessionId}`);
      console.log(`📝 Query: "${input}"`);

      // Get conversation history
      const previousMessages = await this.memoryManager.getMessages(sessionId);

      // Create current human message
      const currentMessage = new HumanMessage(input);

      // Prepare state with full conversation context
      const initialState: AgentStateType = {
        messages: [...previousMessages, currentMessage],
        sessionId: sessionId,
        userId: userId || "",
        intermediate_steps: [],
        context: {
          timestamp: new Date().toISOString(),
          userId: userId,
          metadata: metadata || {},
        },
      };

      // Execute agent
      console.log("🤖 Executing agent workflow...");
      const finalState = await this.agent.invoke(initialState, {
        recursionLimit: 20,
        configurable: {
          thread_id: sessionId,
          user_id: userId,
        },
      });

      // Get the AI response
      const messages = finalState.messages;
      const lastMessage = messages[messages.length - 1];

      if (lastMessage && lastMessage.getType() === "ai") {
        const aiMessage = lastMessage as AIMessage;

        // Add AI response to history
        await this.memoryManager.addMessage(sessionId, currentMessage);
        await this.memoryManager.addMessage(sessionId, aiMessage);

        console.log("✅ Agent completed successfully");

        return {
          success: true,
          sessionId: sessionId,
          response: aiMessage.content as string,
          conversationLength: previousMessages.length + 2,
          query: input,
          timestamp: new Date().toISOString(),
        };
      }

      throw new Error("No valid AI response generated");
    } catch (error) {
      console.error(`❌ Agent Error [${sessionConfig.sessionId}]:`, error);
      return {
        success: false,
        sessionId: sessionConfig.sessionId,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        query: input,
      };
    }
  }

  async getConversationHistory(sessionId: string): Promise<ConversationHistoryResult> {
    try {
      const messages = await this.memoryManager.getMessages(sessionId);

      return {
        success: true,
        sessionId: sessionId,
        messageCount: messages.length,
        messages: messages.map((msg: any) => ({
          type: msg.constructor.name.replace("Message", ""),
          content: msg.content as string,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to retrieve history",
      };
    }
  }

  async clearSession(sessionId: string): Promise<ClearSessionResult> {
    try {
      await this.memoryManager.clearSession(sessionId);
      console.log(`🗑️ Cleared session: ${sessionId}`);
      return { success: true, sessionId: sessionId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to clear session",
      };
    }
  }
}
