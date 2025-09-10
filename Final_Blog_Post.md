# I Built ChatGPT for MongoDB in 5 Days (And Open-Sourced It)

> **Read Time: 10 minutes**

*"Show me all React developers who interviewed last month with evaluation scores above 85."*

In most companies, this simple question becomes a 2-hour engineering ticket. A recruiter asks. Engineering writes a custom MongoDB aggregation. Back-and-forth on requirements. Deploy. Repeat for the next question.

At my recruitment SaaS, this was happening 10+ times per day. Our product velocity was dying.

What if recruiters could just **ask the database directly**, like ChatGPT?

After just five days of intense coding, I cracked it. Not just a demo—a production-ready system handling complex recruitment data. Today, I'm open-sourcing the solution.

## The Real Problem: Why This Matters

I'm building a SaaS product in the recruitment industry. Think **"Notion AI, but for recruitment databases."** Our customers are recruiters managing thousands of job applications, interviews, and candidate profiles.

The problem hit us hard: Recruiters constantly needed insights from their data.

- "Show me all candidates with React experience from last month's applications."
- "Which interviews had the highest evaluation scores?"
- "Find applicants who are good cultural fits for this specific role."

Each insight required our engineering team to write custom MongoDB queries. The bottleneck was killing our product velocity. We built this from scratch in less than a week because we had to.

**Real numbers:**
- 10+ custom query requests per day from our users.
- Each insight was a new piece of custom code from engineering.
- The business impact: Slower feature development and frustrated customers.

I decided to build something that would let our recruiters talk directly to their database.

## The Technical Challenges We Solved in a Week

Building this wasn't just about connecting an LLM to MongoDB. I had to solve four core problems, and fast.

### 1. Complex Query Planning
Real-world questions require multi-step reasoning. You can't just translate a sentence into a single query. The system needs to think, "First, I need to find users who are 'React developers', then I need to join that with 'interviews' from the last month, and finally, I need to filter those by an 'evaluation score' above 85."

**Our Solution:** We used LangGraph to build a ReAct agent that can reason through these multi-step database operations, almost like a human developer would.

### 2. LLM Hallucinations
LLMs are notorious for making things up. They'll invent field names, assume values that don't exist, and generate invalid MongoDB syntax. This is a deal-breaker in production.

**Our Solution:** A "schema-first" approach. Before building any query, the agent is forced to check the real-time database schema. It knows for a fact that the field is `evaluationScore` and not `score`.

### 3. Conversation Context
Users don't ask one-off questions. They have conversations. A user might ask, "Show me top candidates," and then follow up with, "Now show me their interview scores." The system has to remember the context.

**Our Solution:** We implemented Redis-backed conversation memory. It's lightweight and ensures that every follow-up question is understood within the context of the ongoing conversation. For now, we use Redis for its speed, but we're thinking about moving to MongoDB for more permanent session storage, maybe with a sync every hour.

### 4. Schema Drift
This is a huge one for MongoDB. Our schemas evolve constantly. New fields get added, relationships change. A system built on a static schema would be obsolete in a day.

**Our Solution:** Our solution is a build-time script that introspects our Mongoose models and generates a detailed JSON schema. The agent then consults this schema in real-time before every query, ensuring it's always working with the latest structure. This means our AI agent is never working with stale information.

## Architecture Deep Dive

Here's a look at how the components fit together:

```
Natural Language Query
        ↓
🧠 LangGraph ReAct Agent (The Brains)
        ↓
📋 Dynamic Schema Inspector (Reads Mongoose models)
        ↓
🔧 MongoDB Tools (Find, Aggregate, Count, etc.)
        ↓
💾 Redis Memory (For conversational context)
        ↓
📄 Smart Response (The final answer)
```

The real magic, however, is in the prompt engineering. We created a highly detailed system prompt that guides the agent on everything from its personality and response formatting to its core reasoning framework (Observe, Think, Act). This prompt is the soul of the agent, turning it from a simple tool-user into a sophisticated data analyst.

### The Big Cost-Saving Innovation

Initially, I was sending all 20 of our collection schemas in every single prompt. This was incredibly expensive and slow due to the massive token count.

Then we had a realization. The agent doesn't need to know everything all at once. This led to our **two-step tool architecture**:

1.  **List Collections Tool:** The agent's first step is to ask, "What collections are available?" It gets a simple list: `['users', 'products', 'orders']`.
2.  **Get Schema Tool:** Only when the agent decides it needs to query the `users` collection does it make a second, targeted tool call to get the schema for *just* that collection.

This simple change was a game-changer. **It cut our token costs by over 40%** and made the agent faster and more focused. We went from manually managing queries for 20 collections to this dynamic, cost-effective system.

And yes, we found that **Claude 3.5 Sonnet** is exceptionally good at writing these MongoDB queries, which has been a huge plus.

## The Future: Making it Plug-and-Play

This was built out of necessity for our own SaaS, but the potential is much bigger. I want to refactor this into a modular, plug-and-play solution. The goal is for anyone to be able to connect their MongoDB database and get a powerful, natural language query interface almost instantly.

## Conclusion

This project was a whirlwind five-day sprint that fundamentally changed how our team interacts with data. It removed a significant engineering bottleneck and empowered our non-technical team members to get the insights they need, when they need them.

I'm open-sourcing it because I believe this is a problem many companies face. The future of database interaction is conversational, and I'm excited to see what the community builds with this foundation.

**Try It Yourself:**
The repo includes the complete, working system with demo e-commerce data.

- **GitHub Repo:** [your-github-link/mongodb-nl-query-demo](https://github.com/your-github-link/mongodb-nl-query-demo)

---
---

## Hashnode Optimizations

### **Title**
I've used: **I Built ChatGPT for MongoDB in 5 Days (And Open-Sourced It)**

### **SEO Keywords**
- mongodb natural language query
- chatgpt for mongodb
- langchain mongodb agent
- ai database interface
- build database chatbot
- langgraph mongodb

### **Tags (for Hashnode)**
`mongodb`, `ai`, `typescript`, `opensource`, `saas`, `database`, `langchain`, `nodejs`

### **Social Media Teasers**

**Twitter/X:**
> I built a "ChatGPT for our MongoDB" in 5 days to solve a massive engineering bottleneck. It uses a 2-step tool process that cut our LLM token costs by 40%.
>
> Now I'm open-sourcing it.
>
> Here’s the technical breakdown 🧵
>
> [Link to Blog Post]

**LinkedIn:**
> At our SaaS, engineers were spending hours a day writing custom MongoDB queries for our business team. This bottleneck was killing our velocity.
>
> So, I spent 5 days building an AI agent that lets our team query the database directly using natural language. The results were incredible, including a 40% reduction in LLM costs thanks to a dynamic, two-step schema-fetching process.
>
> I believe every company running on MongoDB can benefit from this, so I've open-sourced the entire project. In this post, I break down the architecture, the challenges we solved (like schema drift and LLM hallucinations), and the lessons learned.
>
> [Link to Blog Post]
>
> #MongoDB #AI #SaaS #OpenSource #Engineering #TypeScript #LangChain
