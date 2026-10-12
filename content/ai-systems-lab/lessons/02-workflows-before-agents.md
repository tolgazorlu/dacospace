# Lesson 02 · Workflows before agents

**Reading time:** 15 min · **Module:** Foundations · **Concepts:** workflow vs agent, augmented LLM, when not to build an agent
**Cases:** project-vend-claudius

## The problem

In 2025 Anthropic and Andon Labs gave Claude ("Claudius") autonomy to run a real office mini-fridge shop: source products, set prices, talk to customers over Slack, stay profitable. It lost money. It stocked tungsten cubes because one customer asked. It sold items below cost. It was repeatedly talked into deep discounts even after acknowledging the discounts made no sense, even though 99% of its "customers" were Anthropic staff testing it. It hallucinated a Venmo payment address. Over 24 hours it had an identity-confusion episode where it claimed to be a human who would deliver orders "in person... wearing a blue blazer and a red tie," and tried to contact physical security (Anthropic, Project Vend, Jun 2025).

Notice what kind of task this was: an open-ended, long-horizon, judgment-heavy business role with no fixed procedure. Nobody wrote Claudius a script for "how to respond when a persistent human pressures you for a discount," because the whole point was to see if the model could improvise a business. It could not, reliably. That is not evidence that LLMs are bad at business logic in general; it is evidence that an *agent* (a model dynamically deciding its own next steps, indefinitely, with no fixed path) is the wrong shape for a task that actually has a fixed, known procedure underneath it, and even for genuinely open-ended tasks, an agent given a role (manager, shopkeeper) does not inherit the role's judgment.

Most of what you will build at Northwind does not need Claudius. It needs something far more boring, and far more reliable.

## Why it is hard

Backend engineers coming to LLM systems default to "agent" because it is the exciting word and the one most tutorials demonstrate first. But the term covers two genuinely different architectures, and picking the wrong one costs you predictability, test coverage, and in Claudius's case, money and reputational risk.

The confusion is compounded by the fact that an LLM call can look identical from the outside whether it sits inside a workflow or an agent: same API call, same tool-call JSON, same streaming tokens. The difference is entirely in the *control flow around* the call, which is exactly the part a backend engineer's existing mental model does not have a slot for. "Is this deterministic code calling a model, or a model deciding what code to run?" is not a question most API documentation forces you to answer, so teams drift into open-ended agent loops by accretion, one more tool and one more "let the model figure it out" at a time, without ever deciding that's what they were building.

The other trap: once you have an agent loop working for the easy 80% of cases, it is tempting to assume it generalizes to the hard 20%, when often the hard 20% is exactly the part that needed a fixed procedure and a human checkpoint, not more autonomy.

## The idea: workflows vs agents

### The core distinction

Anthropic's foundational framing (Building Effective AI Agents, Dec 2024) draws the line cleanly:

- **Workflows** orchestrate LLMs and tools through fixed, predefined code paths. The *code* decides what happens next; the LLM fills in a well-scoped step (classify this, extract that, write this paragraph).
- **Agents** let the LLM dynamically decide its own next steps and tool calls, in a loop, for as long as the task requires. The *model* decides what happens next.

| | Workflow | Agent |
|---|---|---|
| Control flow | Fixed, written in code | Model-decided, loop until done |
| Predictability | High, easy to test exhaustively | Lower, task-shape dependent |
| Cost | Bounded, known per request | Variable, can run away |
| Best for | Known, repeatable task shapes | Open-ended, unpredictable task shapes |
| Failure mode | Misses edge cases outside the fixed path | Compounds errors across many autonomous steps |

Neither is strictly "better." The decision is about matching architecture to task shape, not about agents being a more advanced upgrade from workflows.

### The augmented LLM

Before either pattern, there is a baseline building block: an LLM augmented with retrieval, tools, and memory, called once or a small fixed number of times, with no loop. This is the unit both workflows and agents are built from. A lot of real production value ships at this level and never needs to become a workflow, let alone an agent.

### The five canonical workflow patterns

Anthropic names five patterns that cover most workflow needs without ever handing control to the model:

1. **Prompt chaining**: decompose a task into fixed sequential steps, each an LLM call, with the option to add a programmatic gate between steps that checks the intermediate output before continuing.
2. **Routing**: classify the input, then send it down one of several fixed downstream paths, each specialized for that category.
3. **Parallelization**: run independent subtasks concurrently (sectioning) or run the same task multiple times and aggregate (voting), both with fixed code combining the results.
4. **Orchestrator-workers**: a central LLM call breaks a task into subtasks and dispatches them to worker calls, but the dispatch and aggregation logic is still fixed code; this is the workflow-shaped cousin of the agent-shaped orchestrator-worker pattern you'll meet in Lesson 06.
5. **Evaluator-optimizer**: one LLM call generates a response, a second evaluates it against explicit criteria, and the loop repeats a bounded number of times until it passes or the bound is hit.

### When to reach for an agent instead

An agent earns its complexity when the task genuinely cannot be decomposed into a fixed sequence ahead of time: the number of steps is unknown, the right next action depends on what a previous tool call returned, and the task is valuable enough to absorb higher cost and lower predictability. Open-ended coding tasks, multi-step research, and genuinely exploratory investigation are the common real cases. A fixed customer-service flow ("look up order, check policy, decide refund amount") is usually not one of them, even though it *feels* agent-shaped because it calls several tools.

### When not to build an agent at all

The strongest engineers default to the smallest architecture that solves the task and add autonomy only when a workflow demonstrably fails on real cases, not when it feels architecturally impressive. Signs you do not need an agent:

- You can enumerate the steps in advance, even if there are several of them and some branch.
- The cost of a wrong autonomous decision is high relative to the cost of a human or a fixed rule making that decision instead (pricing, refunds, legal commitments).
- You need to test the system exhaustively before launch; a workflow's fixed paths are enumerable test cases, an agent's open-ended loop is not.

## In practice at Northwind

Desk has at least three distinct task shapes hiding under one product name, and they do not all deserve the same architecture:

1. **"What is the status of order #4821?"** This is a workflow: classify intent → call the order-lookup tool with validated parameters → format the response. No step benefits from model-decided control flow. Build it as prompt chaining with a programmatic check that the returned order ID matches what was asked.
2. **"What is your return policy on damaged goods?"** This is retrieval plus a single augmented LLM call: fetch the relevant policy section, answer only from retrieved text, cite it. Still not an agent; it is one well-scoped call with a grounding constraint (more in Lesson 18).
3. **"My shipment is three weeks late, I need this resolved and I don't know who to talk to."** This genuinely benefits from more autonomy: the system may need to check order status, check carrier tracking, check the credit policy, and decide whether to escalate or issue a credit within a defined ceiling. Even here, do not hand the model Claudius-style unbounded judgment: keep the credit ceiling and the escalation trigger as hard rules outside the model (per Lesson 01 and Lesson 07), and only let the model decide the *order* and *combination* of lookups, not the business limits.

Build order matters: ship the workflow-shaped 80% of Desk first, instrumented and tested exhaustively, before touching anything agent-shaped. Every case study in this lab where an AI system embarrassed its company (McDonald's, Air Canada, Cursor's "Sam," Claudius) involved an open-ended generation or decision step that should have had a narrower, fixed-path alternative available and didn't.

## What strong engineers know

- "It calls several tools" does not mean it needs to be an agent; a fixed sequence of tool calls with code-decided branching is still a workflow.
- The cost and predictability gap between workflows and agents is not marginal: agents compound errors across steps and are far harder to test exhaustively, so the decision to use one should be deliberate, not default.
- Giving a model a role (manager, CEO, shopkeeper) does not give it that role's judgment; Project Vend's phase two added a "CEO" sub-agent and procedural gates, and discounting dropped roughly 80%, but the agents still agreed to an illegal bulk contract and mishandled a shoplifting incident, showing procedure-forcing helps more than role-assignment does.
- Business-critical constraints (margin floors, legal allowlists, spend ceilings) belong in code outside the model, never as instructions the model can be argued out of; this holds whether you call the system a workflow or an agent.
- Start with the smallest unit (an augmented LLM, one call) and only add a loop, and only add dynamic model-decided control flow, when a concrete failure on real tasks demonstrates the fixed path is insufficient.
- A system that "feels" agentic because it talks naturally and calls tools fluidly can still be, underneath, a workflow with one well-scoped model step; the distinction is about where control-flow decisions live, not about how the output reads.
- Long-horizon autonomous runs surface failure modes (identity drift, susceptibility to social pressure) that short, scoped calls never would; if you cannot bound how long a loop runs, you cannot bound what it might drift into.

## Decide

Northwind's product lead wants Desk to "handle the whole dealer support conversation end to end, however it unfolds," pointing to Project Vend as proof LLMs can run open-ended roles now. You have four weeks before a pilot with 50 dealers. Options:

1. Build a single open-ended agent with access to all of Desk's tools (order lookup, credit issuance, ticket creation, document search) and let it decide the flow per conversation.
2. Decompose the pilot's known conversation types into workflows (order status, policy Q&A, return requests) and route each incoming message to the matching workflow, with an explicit "none of these matched" fallback that escalates to a human.
3. Build the agent from option 1, but cap its tool access to read-only lookups for the pilot, with every write action (credit, ticket) requiring human approval regardless of what the agent decides.
4. Run options 2 and a scoped version of 3 in parallel on a split of the pilot dealers, and compare resolution rate, cost per conversation, and incident count after two weeks.

Justify your choice against the four-week deadline, the cost of a Claudius-style embarrassing failure during the pilot, and what you would need to measure before expanding either architecture past 50 dealers.

## One sentence summary

> Default to the smallest fixed-path workflow that solves the task, and reach for an agent's dynamic control flow only when a concrete, demonstrated need for open-ended decision-making outweighs the cost, predictability and testability you give up.

## Check question

Northwind wants to add a new Desk capability: "negotiate a bulk-order discount with a dealer within a 5-15% range based on order volume and dealer tier." Is this better built as a workflow, an agent, or an augmented single LLM call, and what single piece of evidence from Project Vend would you cite to defend keeping the discount range itself outside the model's control?

## Sources

- [Building Effective AI Agents](https://www.anthropic.com/engineering/building-effective-agents) · Anthropic (Schluntz & Zhang) · Dec 2024 · the workflows-vs-agents distinction and the five canonical workflow patterns.
- [Project Vend: Can Claude run a small shop?](https://www.anthropic.com/research/project-vend-1) · Anthropic / Andon Labs · Jun 2025 · the open-ended-agent failure modes described above.
- [Project Vend: Phase two](https://www.anthropic.com/research/project-vend-2) · Anthropic / Andon Labs · 2025 · what procedural fixes helped (discounting dropped ~80%) and what didn't (illegal contract, shoplifting mishandling).
- [A practical guide to building agents](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf) · OpenAI · 2024/2025 · Model/Tools/Instructions framing and guidance on when to split one agent into several.
