# Talk to Your MongoDB in Plain English

> Turning every MongoDB database into a conversational AI interface

## Why I Built This

I'm building a SaaS product in the recruitment industry. Think of it like **"Notion AI, but for recruitment databases."** Our customers are recruiters managing thousands of job applications, interviews, and candidate profiles.

The problem: Recruiters constantly needed insights from their data. "Show me all candidates with React experience from last month's applications." "Which interviews had the highest evaluation scores?" "Find applicants who are good cultural fits for this specific role."

Each insight required our engineering team to write custom MongoDB queries. The bottleneck was killing our product velocity.

I spent months building an AI agent that lets recruiters **talk directly to their recruitment database**. This repo is me open-sourcing the core breakthrough.

## What This Actually Does

Instead of this:
```javascript
db.users.aggregate([
  { $match: { country: "USA", totalSpent: { $gte: 1000 } } },
  { $sort: { totalSpent: -1 } },
  { $limit: 10 }
])
```

You just ask:
```
"Show me the top 10 customers from USA who spent over $1000"
```

And get back a conversational response with the data, insights, and explanations.

## The Technical Challenge I Solved

The hard part wasn't connecting an LLM to MongoDB. The hard part was making it **reliable, accurate, and schema-aware**.

### Problem #1: Schema Drift
MongoDB schemas evolve. Hardcoded field mappings break. My solution: **Dynamic schema introspection** that reads your Mongoose models in real-time and generates up-to-date prompts.

### Problem #2: Complex Queries  
Real businesses need cross-collection joins, aggregations, and multi-step reasoning. My solution: **LangGraph ReAct agents** that can plan, execute, and recover from errors across multiple query steps.

### Problem #3: Hallucinations
LLMs make up field names and enum values. My solution: **Schema-first prompting** where the agent always checks the actual schema before building queries.

### Problem #4: Session Memory
Users want to ask follow-up questions. My solution: **Redis-backed conversation memory** that maintains context across the entire conversation.

## Architecture Deep Dive

```
Natural Language Query
        ↓
🧠 LangGraph ReAct Agent (planning & reasoning)
        ↓  
📋 Dynamic Schema Introspection (real-time Mongoose schema analysis)
        ↓
🔧 MongoDB Tools (find/aggregate/count with error recovery)
        ↓
💾 Redis Session Memory (conversation context)
        ↓
📄 Structured Response (with explanations & insights)
```

**Key Innovation: Schema-First Approach**
- Every query starts by introspecting the actual Mongoose models
- Zero hardcoded assumptions about your data structure
- Automatically discovers enum values, constraints, and relationships
- Self-healing when schemas change

## Quick Start

```bash
# Clone and setup
git clone https://github.com/yourusername/mongodb-nl-query-demo
cd mongodb-nl-query-demo
pnpm install

# Add your credentials to .env
cp .env.example .env
# Edit .env with your MongoDB URI and Anthropic API key

# Seed demo data and start
pnpm seed
pnpm start:dev

# Test it
curl -X POST http://localhost:3000/api/query \\
  -H "Content-Type: application/json" \\
  -d '{"query": "Show me all users from USA"}'
```

## Demo Data

I've included a realistic e-commerce dataset to play with:
- **Users**: 5 customers with different spending patterns and membership levels
- **Products**: 5 items across categories (electronics, books, sports)
- **Orders**: 20 realistic transactions with various statuses

## Real Query Examples

Try these with the demo data:

**Simple queries:**
- "How many users do we have?"
- "Show me all Apple products"
- "Find orders that were delivered"

**Complex analytics:**  
- "Which gold members spent the most money?"
- "Show me products with high ratings but low sales"
- "Find users who haven't ordered anything recently"

**Cross-collection insights:**
- "What's the average order value by membership level?"
- "Which product categories are most popular with platinum users?"
- "Show me delivery success rates by city"

## Adapting for Your Database

The beauty is in the schema introspection. To use your own data:

1. **Replace the models** in `src/models/` with your Mongoose schemas
2. **Update the enum** in `src/types/index.ts` with your collection names  
3. **Run the schema generator**: `pnpm generate:schemas`
4. **Start querying** your actual data in plain English

The system automatically discovers:
- All your fields and their types
- Enum values (e.g., user roles, order statuses)
- Required fields and constraints
- References between collections
- Nested object structures

## The ReAct Magic

This isn't just query translation. It's a reasoning agent that:

1. **Observes** your natural language query
2. **Thinks** about the best approach
3. **Acts** by checking schema and building queries
4. **Reflects** on results and tries different approaches if needed
5. **Responds** with insights and explanations

Example reasoning flow:
```
User: "Show me our biggest spenders"
Agent: Let me check the users schema first...
Agent: I see 'totalSpent' field, I'll sort by that descending
Agent: Found 5 users, let me also check their membership levels...
Agent: Here are your top spenders, mostly platinum members...
```

## Production Considerations

I built this for real-world use:

- **Rate limiting** to prevent abuse
- **Redis sessions** for conversation memory
- **Error recovery** when queries fail
- **Token optimization** to minimize LLM costs
- **Type safety** throughout the TypeScript codebase

## Why This Matters

Data democratization isn't just a buzzword. When everyone in your company can ask questions directly to your database, you get:

- **Faster decisions** (no dev bottlenecks)
- **Better insights** (more people exploring data)
- **Reduced engineering load** (fewer ad-hoc query requests)
- **Improved data literacy** (teams understand their data better)

## Technical Deep Dive

If you're curious about the implementation:

### Dynamic Schema Generation
```typescript
// Introspects Mongoose models at runtime
const schema = extractCompleteMongooseSchema(UserModel);
// Generates: "membershipLevel(required) [bronze|silver|gold|platinum]"
```

### ReAct Agent Pattern
```typescript
// Agent reasoning loop
1. Observe: "Show me top users"
2. Think: "Need to check users schema first"
3. Act: collectionSchema("users") 
4. Reflect: "Found totalSpent field, sorting by that"
5. Act: find({ sort: { totalSpent: -1 } })
6. Respond: "Here are your top users..."
```

### Cross-Collection Intelligence
The agent can automatically join collections:
```javascript
// User asks: "Show me orders from gold members"
// Agent reasoning:
// 1. Check orders schema - has 'user' reference
// 2. Check users schema - has 'membershipLevel' enum
// 3. Build aggregation pipeline with $lookup
```

## Contributing

Found this useful? I'd love your contributions:

- **Add write operations** (INSERT, UPDATE, DELETE support)
- **Improve reasoning prompts** (better query planning, error recovery)
- **Build a web UI** (React/Vue interface for non-technical users)
- **Enhanced aggregation patterns** (more complex cross-collection analytics)

## My Tech Stack

- **LLM**: Anthropic Claude (best reasoning, fewer hallucinations)
- **Memory**: Redis (fast, reliable session storage)
- **Framework**: LangChain + LangGraph (mature ecosystem)
- **Backend**: Express + TypeScript (type safety matters)
- **Database**: MongoDB + Mongoose (dynamic schema introspection)


## Questions?

This represents months of R&D distilled into a working demo. If you're building something similar or want to discuss the architecture, feel free to reach out.

The future of database interfaces is conversational. This is my contribution to making that future happen sooner.

---

**Built with curiosity and too much coffee ☕**

*P.S. If this helps your project, a star ⭐ would mean the world to me!*
