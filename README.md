# Talk to Your MongoDB in Plain English

**A production-ready AI agent that transforms any MongoDB database into a conversational interface. Built to solve the real problem of non-technical users needing database insights without engineering bottlenecks.**

## Why I Built This

I'm building a SaaS in the recruitment industry. Our customers are recruiters managing thousands of job applications, interviews, and candidate profiles stored in MongoDB.

**The pain was real**: Recruiters constantly needed insights from their data:
- "Show me all candidates with React experience from last month's applications"  
- "Which interviews had the highest evaluation scores?"
- "Find applicants who are good cultural fits for this specific role"

Each insight required our engineering team to write custom MongoDB queries. **We were getting 10+ query requests per day.** The bottleneck was killing our product velocity.

I spent 5 days building an AI agent that lets recruiters talk directly to their database.

## What This Actually Does

Instead of writing this:
```javascript
db.users.aggregate([
  { $match: { country: "USA", totalSpent: { $gte: 1000 } } },
  { $lookup: { from: "orders", localField: "_id", foreignField: "user", as: "orders" } },
  { $sort: { totalSpent: -1 } },
  { $limit: 10 }
])
```

Your users just ask:
```
"Show me the top 10 customers from USA who spent over $1000 with their recent orders"
```

And get back a conversational response with data, insights, and explanations.

## The Technical Challenges

Building this wasn't just "connect LLM to MongoDB." I had to solve four critical problems that make or break production systems:

### 1. Schema Drift Problem
MongoDB schemas evolve constantly. Hardcoded field mappings break in days.

**My solution**: Dynamic schema introspection that reads your actual Mongoose models in real-time and generates up-to-date prompts. The agent always works with current schema information.

### 2. Complex Query Planning  
Real questions need multi-step reasoning: "Find React developers who aced their interviews" requires understanding relationships between candidates, skills, interviews, and evaluation scores.

**My solution**: LangGraph ReAct agents that think through problems step-by-step, plan multi-collection queries, and recover from errors gracefully.

### 3. LLM Hallucinations
LLMs make up field names, assume enum values that don't exist, and generate invalid MongoDB syntax.

**My solution**: Schema-first prompting where the agent always checks the actual schema before building any query. It knows for certain that the field is `membershipLevel` with values `[bronze|silver|gold|platinum]`, not `status` with made-up values.

### 4. Conversation Memory
Users have conversations, not one-off queries. "Show me top customers" followed by "Now show me their recent orders" should work seamlessly.

**My solution**: Redis-backed conversation memory that maintains context across the entire session.

## Architecture Deep Dive

```
Natural Language Query
        ↓
🧠 LangGraph ReAct Agent (planning & reasoning)
        ↓
📋 Dynamic Schema Introspection (real-time Mongoose analysis)
        ↓
🔧 MongoDB Tools (find/aggregate/count with error recovery)
        ↓
💾 Redis Session Memory (conversation context)
        ↓
📄 Structured Response (with explanations & insights)
```

### The Schema-First Innovation

Every query starts by checking the real schema:

```javascript
// Dynamically introspects your Mongoose models
const schema = extractCompleteMongooseSchema(UserModel);
// Generates: "membershipLevel(required) [bronze|silver|gold|platinum]"
// The agent knows EXACTLY what fields exist and their constraints
```

### ReAct Agent Reasoning

Watch the agent think through a complex query:

```
User: "Show me our biggest spenders"
Agent: OBSERVE → Need to find users with highest spending
Agent: THINK → Should check users schema first to understand fields
Agent: ACT → collectionSchema("users")
Agent: REFLECT → Found totalSpent field, I'll sort by that descending  
Agent: ACT → find({}, {sort: {totalSpent: -1}, limit: 10})
Agent: RESPOND → "Here are your top spenders, mostly platinum members..."
```

### Cross-Collection Intelligence

The agent automatically discovers and uses relationships:

```javascript
// User asks: "Show me orders from gold members"
// Agent reasoning:
// 1. Check orders schema - has 'user' reference to users collection
// 2. Check users schema - has 'membershipLevel' enum with 'gold' value
// 3. Build aggregation pipeline with $lookup automatically
```

## Quick Start

```bash
# Clone and setup
git clone https://github.com/salmankhan-prs/mongodb-nl-query-demo
cd mongodb-nl-query-demo
pnpm install

# Add your credentials
cp .env.example .env
# Edit .env with your MongoDB URI and Anthropic API key

# Seed demo data and start
pnpm seed
pnpm start:dev

# Test it
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me all users from USA"}'
```

## Demo Data & Real Examples  

I've included realistic e-commerce data to play with:
- **5 Users** with different spending patterns and membership levels
- **5 Products** across categories (electronics, books, sports)  
- **20 Orders** with various statuses and payment methods

Try these queries with the demo data:

**Simple queries:**
- "How many users do we have?"
- "Show me all Apple products"
- "Find orders that were delivered"

**Complex analytics:**
- "Which gold members spent the most money?"
- "Show me products with high ratings but low sales"
- "What's the average order value by membership level?"

**Cross-collection insights:**
- "Which product categories are most popular with platinum users?"
- "Show me delivery success rates by city"
- "Find users who haven't ordered anything recently"

## Adapting for Your Database

The magic is in the dynamic schema introspection. To use your own data:

1. **Replace models** in `src/models/` with your Mongoose schemas
2. **Update collection enum** in `src/types/index.ts` 
3. **Run schema generator**: `pnpm generate:schemas`
4. **Start querying** your actual data in plain English

The system automatically discovers:
- All field types and constraints
- Enum values (user roles, order statuses, etc.)
- References between collections
- Nested object structures
- Required fields and validation rules

## Production Lessons

I built this for real-world use. Key learnings:

**Claude > GPT for Database Queries**
- Claude 3.5 Sonnet: Better reasoning, fewer hallucinations
- GPT-4: Makes up field names more often
- Production switch saved 40% error rate

**Token Optimization Matters**  
- Original approach: Send all schemas (massive token cost)
- New approach: Two-step schema fetching (40% cost reduction)
- Agent only fetches schema for collections it actually needs

**Error Recovery Patterns**
- Aggregation fails → Fallback to simple find()
- Invalid field → Re-check schema and retry  
- Memory errors → Add limits and simplify queries

**Redis Sessions Are Critical**
- Users average 3-4 follow-up questions
- "Now show me their recent orders" should just work
- Session memory makes conversations feel natural

## Why This Matters

Data democratization isn't just a buzzword. When everyone in your company can ask questions directly to your database:

- **Faster decisions** (no dev bottlenecks)
- **Better insights** (more people exploring data) 
- **Reduced engineering load** (fewer ad-hoc query requests)
- **Improved data literacy** (teams understand their data better)

## Tech Stack Choices

- **LLM**: Anthropic Claude (superior reasoning for complex queries)
- **Memory**: Redis (fast, reliable session storage)  
- **Framework**: LangChain + LangGraph (mature agent ecosystem)
- **Backend**: Express + TypeScript (type safety throughout)
- **Database**: MongoDB + Mongoose (enables dynamic schema introspection)

## Contributing

Found this useful? I'd love your contributions:

- **Add write operations** (INSERT, UPDATE, DELETE support)
- **Improve reasoning prompts** (better query planning)
- **Build a web UI** (React interface for non-technical users)
- **Enhanced aggregations** (more complex analytics patterns)
- **Multi-database support** (PostgreSQL, MySQL adapters)





**Built with curiosity and Claude 🤖**

---

## License

MIT - Feel free to use this in your own projects.