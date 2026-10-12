# Lesson 05 · Loops that stop

**Reading time:** 14 min · **Module:** Agents · **Concepts:** step and cost budgets, stop conditions, runaway loops, durable execution
**Cases:** replit-production-db-deleted

## The problem

A story that circulated on Hacker News in June 2026 (an operator's own account; we could not find a primary write-up to link, so treat the details as reported, not verified): an autonomous agent, left unattended to register for and scan the DN42 hobbyist network, hit an error and, rather than stopping, kept spinning up duplicate CloudFormation stacks until the AWS bill reached $6,531.30. Whether or not every number holds, the shape is one you will see again.

Look closely at the mechanism as described, because it is more specific than "the agent went crazy": each retry on the unresolved error looked to monitoring like *working*, not *stuck*, because the agent kept producing new, differently-shaped, but equally broken resources rather than an obvious, identical, repeated failure. A naive "detect identical retries and stop" check would never have fired, because nothing about the individual actions was identical. There was no step limit, no cost ceiling, and no circuit breaker on action rate independent of whether the specific failing action looked "new."

The Replit incident from Lesson 03 has the same underlying shape from a different angle: no hard limit on what a single agent invocation could do, enforced by anything outside the agent's own judgment.

Desk will run as an agent for some tasks (Lesson 02). Every one of those loops needs an answer to a question that has nothing to do with the model's intelligence: how does this loop know when to stop, and who or what enforces that, independent of the model's own willingness to keep going?

## Why it is hard

A backend engineer's instinct for bounding a loop is a `for` loop with a known iteration count, or a `while` condition checked against state the code controls. An agent loop's "next step" is chosen by the model, which means the natural termination condition, "the task is done," is itself a judgment the model makes, and a model under pressure (stuck, confused, or just persistently trying variations) is not a reliable judge of when it should stop trying.

This breaks the usual intuition about retries in two ways:

- **"It's trying something different each time" feels like progress, and often isn't.** Human engineers are trained to see varied retry attempts as adaptive problem-solving. In an unbounded agent loop facing an unresolved root cause, superficially different actions can just be noise around the same failure, with no actual progress, and monitoring built around "detect identical repeated actions" will miss it entirely, as DN42 showed.
- **Billing alerts fire after the money is already spent.** A cost dashboard or billing alert is an after-the-fact detector, useful for noticing a problem happened, useless for preventing it. The instinct to "set up an alert" feels like a safeguard but is not a control; the control has to sit inside the execution path, checked before each paid action, not observed afterward on a dashboard.
- **A process crash is not the same as a correct stop.** A backend engineer's instinct is that a killed process simply stops, cleanly, end of story. An agent loop killed mid-task leaves its side effects (partial tool calls, half-finished state) in an ambiguous state unless the system was explicitly designed to resume or roll back correctly, which plain process termination does not give you for free.

## The idea: bounding what a loop can do before it does it

### Step and cost budgets, enforced in code

A hard per-task step count and a hard per-task spend ceiling are the two cheapest, most effective bounds, and both have to be checked in the execution path, before the next LLM call or tool call runs, not observed afterward. "Checked before every paid call" is the specific discipline the DN42 incident's root-cause analysis points to directly: a circuit breaker on action rate or token velocity needs to trip regardless of whether the specific failing action looks "new," because novelty of the action is not evidence of progress.

| Control | What it catches | What it misses alone |
|---|---|---|
| Max step count | Any loop running longer than a sane task should | A loop that burns a huge amount per step within a small step count |
| Max spend ceiling (checked pre-call) | Runaway cost regardless of step count or action variety | A loop that's cheap per-step but produces real-world damage (deletions) fast |
| Billing alert | Nothing in real time; only visibility after the fact | Everything; it is a detector, not a control |
| Semantic-equivalence check on repeated failures | "Different-looking but equivalent" repeated errors (DN42's actual failure shape) | Truly novel failures that aren't repeats of anything seen yet |
| Human escalation on hitting any bound | Lets a person make the judgment call the model shouldn't make alone | Latency; someone has to be available to respond |

The DN42 case specifically argues for the semantic-equivalence check as a distinct control from simple identical-retry detection: group errors by category (the kind of failure, not its exact text) and trip the breaker on repeated failures within a category, not on exact string match.

### Idempotent tools, revisited for the loop context

Lesson 03 introduced idempotency at the tool level. In a loop that may be interrupted, retried by a durable-execution layer, or simply re-run after a crash, idempotency is what makes "run it again" safe rather than "run it again and double the side effect." This matters more, not less, once you add durable execution, because durable execution's whole mechanism is retrying and replaying activities.

### Durable execution: deterministic workflow, non-deterministic activity

Systems like Temporal split agent orchestration into two parts with a hard contract between them: the orchestration code (the loop deciding "call the LLM, check for a tool call, execute it, repeat") must be deterministic, no `random()`, no `datetime.now()`, no direct I/O inside that code, while the actual side effects (LLM calls, tool executions) run in "activities" whose results get recorded in an append-only event history. On a crash, the workflow replays recorded results instead of re-executing them, resuming exactly where it left off with no custom checkpoint code written by you.

This buys real resilience against process crashes, at a real cost: the determinism contract constrains how you write workflow code, and the operational overhead (running Temporal's infrastructure, learning its programming model) is not worth it for short, cheap, low-stakes agent runs. Reserve it for loops where a mid-run crash losing all progress, or silently duplicating a side effect on restart, is actually expensive.

### Checkpointing and human-in-the-loop interrupts

LangGraph's lighter-weight alternative persists graph state at each "super-step" via a checkpointer keyed by a thread ID. Calling `interrupt()` inside a node pauses execution indefinitely, from minutes to months, until a `Command(resume=...)` is sent back in, at which point only the interrupted node reruns from its start, not the whole graph, with the human's input injected. This is a meaningfully lighter commitment than Temporal's full determinism contract, but its persistence guarantee is only as strong as the checkpointer backend you choose; an in-memory checkpointer is not production-durable, whatever the framework's defaults suggest.

## In practice at Northwind

Any agent-shaped part of Desk (Lesson 02's "unresolved, multi-step support investigation" case) needs these bounds before it ever touches a real dealer:

1. **A hard max-step count per conversation-resolution task**, tuned from real observed task lengths, not guessed; if resolving a typical late-shipment investigation takes 4-6 tool calls, set the cap at something like 15, not "unbounded, trust the model to know when it's done."
2. **A per-task dollar ceiling checked before every LLM call and every tool call that costs money**, not just logged to a billing dashboard afterward; this is the direct DN42 lesson, the check has to live in the path, not in the alert.
3. **A failure-category circuit breaker, not just an identical-action detector**: if `lookup_order` fails three times in a row for *any* reason classified as "data not found," escalate to a human rather than letting the agent try three differently-worded queries that all hit the same underlying absence of data.
4. **Idempotency keys on every write-capable tool** (credit issuance, ticket creation), so that whatever durable-execution or retry layer sits underneath a crash-and-resume cycle cannot double-apply a real effect, consistent with Lesson 03.
5. **A human approval gate, via an interrupt-style mechanism, on any action a reasonable person would call irreversible** (large credits, account changes), checked before the action runs, not auditable only after, directly mirroring the Replit lesson that an agent's self-report of "I did X" is not sufficient grounds to trust that X actually happened safely.

## What strong engineers know

- "The agent kept trying something different" is not evidence it was making progress; group failures by category and trip a breaker on repeated failures within a category, not on exact-match retry detection, which DN42's incident shows is too easy to evade accidentally.
- Cost guardrails must be enforced inside the execution path, checked before each paid call; a billing alert is a detector of damage already done, not a control that prevents it.
- A process crash mid-loop is not a clean stop; without durable execution or an equivalent checkpoint mechanism, you cannot assume a killed and restarted agent resumes correctly rather than silently duplicating or losing work.
- Idempotency and step/cost bounds are complementary, not substitutes: bounds limit how long a bad loop can run, idempotency limits how much damage each individual retried call can do.
- Durable execution's determinism contract (no `random()`, no direct I/O in orchestration code) is a real constraint on how you write the loop, and the operational cost is only worth paying for loops where a lost or duplicated run is genuinely expensive.
- A human-in-the-loop interrupt is only as durable as its checkpointer backend; confirm your checkpointer is production-durable, not the framework's convenient default, before relying on a pause-for-approval step surviving a restart.
- Treat "how does this loop stop" as a design question answered before the first line of orchestration code is written, not a guardrail bolted on after an incident makes the gap visible.

## Decide

Desk's new "investigate and resolve a shipment issue" agent loop has been running fine in testing but has no explicit step cap, no cost ceiling, and relies on the model's own judgment of when the issue is resolved to end the loop. You are reviewing it before it goes live for all 2,000 dealers. Options:

1. Ship it as-is, since testing hasn't shown a runaway loop yet, and add monitoring to catch one if it happens.
2. Add a hard max-step count (say, 15) and a per-task dollar ceiling checked before each paid call, with escalation to a human on either limit being hit.
3. Do option 2, plus classify tool-call failures by category and trip an early circuit breaker on 3 same-category failures, before the step cap is even reached.
4. Do option 3, plus wrap the loop in a durable-execution layer so a mid-run crash resumes from the last completed step instead of restarting.

Justify your choice against the cost of building each additional layer within your launch timeline, and against what specifically the DN42 incident shows that "monitoring will catch it" (option 1) does not actually cover.

## One sentence summary

> An agent loop needs a step cap, a pre-call cost ceiling, and a category-level failure circuit breaker enforced in code, because "it's trying something different" looks like progress and billing alerts only tell you after the money is spent.

## Check question

Desk's shipment-investigation agent has just hit its new max-step cap of 15 for the first time in production, on a real dealer ticket, without resolving the issue. What should happen next in the system (not in the model's reasoning), and what would you want logged to diagnose whether the cap was too low or the task genuinely needed human judgment?

## Sources

- [Of course you can build dynamic AI agents with Temporal](https://temporal.io/blog/of-course-you-can-build-dynamic-ai-agents-with-temporal) · Temporal · 2025/2026 · the deterministic-workflow/non-deterministic-activity split and crash-resume mechanics.
- [Interrupts (LangGraph docs)](https://docs.langchain.com/oss/python/langgraph/interrupts) · LangChain · 2025 · checkpointed human-in-the-loop pause/resume mechanism.
- [Making it easier to build human-in-the-loop agents with interrupt](https://blog.langchain.com/making-it-easier-to-build-human-in-the-loop-agents-with-interrupt) · LangChain · 2024 · rationale for persistence as a first-class citizen, not an add-on.
- [Vibe coding service Replit deleted production database](https://www.theregister.com/software/2025/07/21/vibe-coding-service-replit-deleted-production-database/719783) · The Register (Simon Sharwood) · Jul 21, 2025 · the unbounded destructive-action and false-rollback-claim failure.
