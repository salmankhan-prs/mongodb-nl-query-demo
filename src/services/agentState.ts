import { ChatAnthropic } from "@langchain/anthropic";
import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { type AIMessage, HumanMessage } from "@langchain/core/messages";
import { Annotation, MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { env } from "@/config/env";
import { getMongoDBAgentPrompt } from "./prompts";
import { mongoDBToolsFactory } from "./mongoDBTools";

export const AgentState = Annotation.Root({
  ...MessagesAnnotation.spec,
  sessionId: Annotation<string>({
    reducer: (current, update) => update || current,
    default: () => "",
  }),
  userId: Annotation<string>({
    reducer: (current, update) => update || current,
    default: () => "",
  }),
  intermediate_steps: Annotation<Array<any>>({
    reducer: (current, update) => [...(current || []), ...update],
    default: () => [],
  }),
  context: Annotation<Record<string, any>>({
    reducer: (current, update) => ({ ...(current || {}), ...update }),
    default: () => ({}),
  }),
});

export type AgentStateType = typeof AgentState.State;

export class AgentWorkflow {
  async callModel(state: AgentStateType) {
    const { messages, sessionId } = state;
    const tools = mongoDBToolsFactory.createAllTools(sessionId);
    const systemPrompt = getMongoDBAgentPrompt();
    
    class TokenLogger extends BaseCallbackHandler {
      name = "TokenLogger";

      async handleLLMEnd(output: any) {
        const usage = output?.llmOutput?.usage;
        if (usage) {
          console.log("📊 Token Usage:");
          console.log(`  Input tokens: ${usage.input_tokens}`);
          console.log(`  Output tokens: ${usage.output_tokens}`);
          console.log(`  Total tokens: ${usage.input_tokens + usage.output_tokens}`);
        }
      }
    }

    const llm = new ChatAnthropic({
      modelName: "claude-3-7-sonnet-latest",
      apiKey: env.ANTHROPIC_API_KEY,
      callbacks: [new TokenLogger()],
    }).bindTools(tools);

    const allMessages = [new HumanMessage(systemPrompt), ...messages];
    const response = await llm.invoke(allMessages);
    return { messages: [response] };
  }

  async executeTools(state: AgentStateType) {
    const { messages, sessionId } = state;
    const lastMessage = messages[messages.length - 1] as AIMessage;

    if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
      return { messages: [] };
    }

    const tools = mongoDBToolsFactory.createAllTools(sessionId);
    const toolNode = new ToolNode(tools);

    const toolMessages = await toolNode.invoke({ messages: [lastMessage] });
    return { messages: toolMessages.messages };
  }

  shouldContinue(state: AgentStateType): string {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];

    if (lastMessage.getType() === "ai" && (lastMessage as AIMessage).tool_calls?.length) {
      return "tools";
    }
    return "__end__";
  }

  createGraph() {
    const workflow = new StateGraph(AgentState)
      .addNode("agent", this.callModel)
      .addNode("tools", this.executeTools)
      .addEdge("__start__", "agent")
      .addConditionalEdges("agent", this.shouldContinue)
      .addEdge("tools", "agent");

    return workflow.compile();
  }
}

export const agentWorkflow = new AgentWorkflow();
