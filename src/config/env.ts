import { cleanEnv, num, str } from "envalid";
import dotenv from "dotenv";

dotenv.config();

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ default: "development", choices: ["development", "production", "test"] }),
  PORT: num({ default: 3000 }),
  MONGODB_URI: str(),
  REDIS_URL: str({ default: "" }),
  ANTHROPIC_API_KEY: str({ default: "" }),
  OPENAI_API_KEY: str({ default: "" }),
  SESSION_TTL: num({ default: 3600 }),
  MEMORY_TYPE: str({ default: "memory", choices: ["redis", "memory"] }),
  MEMORY_CONNECTION_STRING: str({ default: "" }),
});
