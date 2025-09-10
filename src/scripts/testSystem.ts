import { connect, connection } from "mongoose";
import { env } from "../config/env";

async function testSystem() {
  console.log("🧪 Testing MongoDB Natural Language Query System...\n");

  // Test 1: Environment Variables
  console.log("1. 📋 Checking Environment Variables:");
  console.log(`   ✅ MONGODB_URI: ${env.MONGODB_URI ? "✓ Set" : "❌ Missing"}`);
  console.log(`   ✅ ANTHROPIC_API_KEY: ${env.ANTHROPIC_API_KEY ? "✓ Set" : "❌ Missing"}`);
  console.log(`   ✅ REDIS_URL: ${env.REDIS_URL ? "✓ Set" : "⚠️  Optional (will use in-memory)"}`);
  console.log(`   ✅ PORT: ${env.PORT}`);

  // Test 2: MongoDB Connection
  console.log("\n2. 🗄️  Testing MongoDB Connection:");
  try {
    await connect(env.MONGODB_URI);
    console.log("   ✅ MongoDB connection successful");
    
    // Check if collections exist and have data
    const collections = await connection.db?.listCollections().toArray();
    const collectionNames = collections?.map(c => c.name) || [];
    
    console.log(`   📊 Found collections: ${collectionNames.join(", ")}`);
    
    if (collectionNames.includes("users") && collectionNames.includes("products") && collectionNames.includes("orders")) {
      console.log("   ✅ Sample collections detected");
    } else {
      console.log("   ⚠️  Sample collections missing - run 'pnpm seed' to create them");
    }
    
  } catch (error) {
    console.log("   ❌ MongoDB connection failed:", error);
    return;
  }

  // Test 3: AI Configuration
  console.log("\n3. 🤖 AI Configuration:");
  if (env.ANTHROPIC_API_KEY) {
    console.log("   ✅ Using Anthropic Claude");
  } else if (env.OPENAI_API_KEY) {
    console.log("   ✅ Using OpenAI (Note: Update agentState.ts to use ChatOpenAI)");
  } else {
    console.log("   ❌ No AI API key found - set ANTHROPIC_API_KEY or OPENAI_API_KEY");
  }

  // Test 4: Required Files
  console.log("\n4. 📁 Checking Required Files:");
  const requiredFiles = [
    'src/models/User.ts',
    'src/models/Product.ts', 
    'src/models/Order.ts',
    'src/services/mongoDBTools.ts',
    'src/services/agentState.ts',
    'src/services/prompts.ts',
    'src/controllers/chatController.ts',
    'src/index.ts'
  ];

  try {
    const fs = require('fs');
    for (const file of requiredFiles) {
      if (fs.existsSync(file)) {
        console.log(`   ✅ ${file}`);
      } else {
        console.log(`   ❌ ${file} - Missing`);
      }
    }
  } catch (error) {
    console.log("   ⚠️  Could not check files (run from project root)");
  }

  // Test Summary
  console.log("\n🎉 System Test Complete!");
  console.log("\n📋 Next Steps:");
  console.log("1. If collections are missing: pnpm seed");
  console.log("2. Start the server: pnpm start:dev");
  console.log("3. Test a query: curl -X POST http://localhost:3000/api/query -H 'Content-Type: application/json' -d '{\"query\": \"Show me all users\"}'");
  
  await connection.close();
  process.exit(0);
}

testSystem().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});
