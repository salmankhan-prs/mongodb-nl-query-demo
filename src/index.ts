import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import { connectDatabase } from "@/config/database";
import { env } from "@/config/env";
import { chatController } from "@/controllers/chatController";

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: env.NODE_ENV === "production" ? false : ["http://localhost:3000", "http://localhost:5173"],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

// Logging
app.use(pinoHttp({
  level: env.NODE_ENV === "production" ? "info" : "debug",
}));

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get("/health", chatController.getHealth);

// API Routes
app.post("/api/query", chatController.processQuery);

// Welcome endpoint
app.get("/", (req, res) => {
  res.json({
    message: "🚀 MongoDB Natural Language Query API",
    description: "Transform any MongoDB database into a natural language interface using LangChain and LangGraph",
    endpoints: {
      health: "GET /health",
      query: "POST /api/query",
    },
    documentation: "See README.md for setup and usage instructions",
    version: "1.0.0",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

// Global error handler
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("❌ Unhandled error:", error);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: env.NODE_ENV === "development" ? error.message : undefined,
  });
});

// Start server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDatabase();
    
    // Validate environment
    if (!env.ANTHROPIC_API_KEY && !env.OPENAI_API_KEY) {
      console.warn("⚠️  No AI API key found. Please set ANTHROPIC_API_KEY or OPENAI_API_KEY");
    }

    // Start the server
    app.listen(env.PORT, () => {
      console.log(`🚀 Server running on port ${env.PORT}`);
      console.log(`📍 Health check: http://localhost:${env.PORT}/health`);
      console.log(`🔍 Query endpoint: http://localhost:${env.PORT}/api/query`);
      console.log(`🌍 Environment: ${env.NODE_ENV}`);
      
      if (env.REDIS_URL) {
        console.log("💾 Redis session storage: enabled");
      } else {
        console.log("💾 Session storage: in-memory (not persistent)");
      }
      
      console.log("\\n💡 Try POST /api/query with:");
      console.log('{"query": "Show me all users from USA"}');
      console.log('{"query": "Find Apple products under $1000"}');
      console.log('{"query": "Get all delivered orders"}');
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
