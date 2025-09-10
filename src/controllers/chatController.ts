import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { mongoDbAgentLangChain } from "../services/agentFactory";

export class ChatController {
  async processQuery(req: Request, res: Response) {
    try {
      const { query, sessionId, userId } = req.body;

      if (!query || typeof query !== "string") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: "Query is required and must be a string",
        });
      }

      console.log(`🔍 Processing natural language query: "${query}"`);

      const result = await mongoDbAgentLangChain(query, sessionId, userId);

      return res.status(StatusCodes.OK).json({
        success: result.success,
        data: result,
      });
    } catch (error) {
      console.error("❌ Error processing query:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async getHealth(req: Request, res: Response) {
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "MongoDB Natural Language Query API is running",
      timestamp: new Date().toISOString(),
      status: "healthy",
    });
  }
}

export const chatController = new ChatController();
