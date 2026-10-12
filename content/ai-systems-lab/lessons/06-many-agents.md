# Lesson 06 · Many agents, many failures

**Reading time:** 16 min · **Module:** Agents · **Concepts:** multi-agent trade-offs, orchestrator-worker, MAST failure taxonomy
**Cases:** project-vend-claudius

## The problem

In June 2025, two teams published sharply opposing conclusions about multi-agent systems within days of each other. Anthropic reported that a Claude Opus 4 lead agent orchestrating Sonnet 4 subagents beat a single Opus 4 agent by 90.2% on breadth-first research tasks, at roughly 15x the token cost of a single chat turn (agents alone run about 4x). Cognition published "Don't Build Multi-Agents," arguing that multi-agent systems reliably break down when subagents receive only a compressed task summary instead of full upstream context, and when subagents acting in parallel without seeing each other's work make locally reasonable but mutually incompatible decisions; their canonical example is two subagents independently building mismatched halves of a Flappy Bird clone.

Both are right, about different task shapes. Anthropic's case is parallel, independent, high-value research, pursuing genuinely separate directions simultaneously (their own example: "find all board members of IT companies in the S&P 500"). Cognition's failure case is tightly coupled work where subagents' decisions must be mutually consistent, and compressing context down to a one-line task summary throws away exactly the information that would have let them stay consistent. Cognition's later update, "Multi-Agents: What's Actually Working," narrows the original claim rather than reversing it: don't build peer agents sharing mutable state without isolation, which is compatible with Anthropic's scoped, isolated subagent pattern.

A separate, independent line of evidence makes the stakes concrete without relying on either company's framing: researchers analyzing 150-200+ execution traces across seven popular multi-agent frameworks built MAST (Multi-Agent System Failure Taxonomy), 14 failure modes across three categories, with a strong inter-annotator agreement (Cohen's Kappa 0.88). One finding from that study: ChatDev, a multi-agent coding framework, achieved only 33.33% correctness on a straightforward, well-documented programming task, despite abundant online examples and built-in verifiers. Multi-agent failure, per MAST, is not primarily a model-capability problem; it is a systems-engineering problem of specification clarity, inter-agent verification, and termination conditions, and the paper's own two interventions (better role specification, better orchestration) only partially fixed it.

## Why it is hard

A backend engineer's instinct toward "agents working together" is colored by distributed-systems intuition that mostly does not transfer cleanly. Splitting work across services is familiar and usually safe when the services have well-defined contracts and independent failure domains. Splitting an open-ended task across LLM agents introduces a failure class distributed systems does not have: agents can each individually behave reasonably, pass their own local checks, and still jointly produce an incoherent or wrong result, because the thing that keeps distributed work correct, a shared, consistent view of intent and state, is exactly what a compressed task-summary handoff throws away.

The other misleading instinct: "more agents working in parallel" feels like it should be strictly faster and, by extension, cheaper per unit of useful work, the way horizontally scaling stateless web servers is. It is neither, reliably. Anthropic's own telemetry shows multi-agent systems running at roughly 15x the token cost of a single chat turn, a real, measured cost multiplier that has to be weighed against the task's actual value, not assumed away by analogy to cheap horizontal scaling.

Multi-agent failures are also harder to localize than single-agent failures. When one agent fails, you have one trace to read. When a multi-agent system fails, the wrong output might trace back to agent A withholding information agent B needed, to vague task delegation causing duplicated work, or to nobody verifying that the two outputs were ever consistent in the first place, three distinct root causes the MAST taxonomy names explicitly as separate failure clusters, each requiring a different fix.

## The idea: multi-agent is a cost-benefit decision, not an upgrade

### The orchestrator-worker pattern

A lead agent plans, then delegates well-scoped subtasks to subagents, each with an explicit objective, output format, tool guidance, and boundaries, each running with its own context window and reporting back a condensed summary rather than its raw working trace. This is the pattern behind Anthropic's 90.2% improvement, and it works specifically because the subtasks were genuinely parallelizable and largely independent: each subagent pursued a different direction with minimal need to share evolving context mid-task with the others.

### When the orchestrator-worker pattern breaks

Cognition's failure case is the inverse condition: subtasks that are not independent, where one subagent's local decision (a schema field name, a naming convention) is an implicit decision the other subagent needed to know about and didn't, because the delegation handed over a compressed summary instead of the full upstream decision trace. The fix in Cognition's later framing is not "never use subagents," it is "don't let peer agents share mutable state without isolation, and don't compress away decisions that create implicit dependencies between them."

| Condition | Multi-agent likely helps | Multi-agent likely hurts |
|---|---|---|
| Task structure | Genuinely parallel, independent directions | Tightly coupled, interdependent decisions |
| Value vs. cost | High-value enough to absorb ~15x token cost | Modest value, cost multiplier dominates |
| Context sharing need | Minimal mid-task sharing required | Subagents need each other's evolving decisions |
| Verification | Clear, checkable per-subtask output | Success depends on subtle cross-subtask consistency |

### MAST: the failure taxonomy

MAST's 14 failure modes cluster into three categories, worth knowing by name because they point to different fixes:

1. **Specification and system-design issues**: vague task delegation, unclear agent roles and boundaries, causing duplicated or missing work before any agent has even made a mistake in execution.
2. **Inter-agent misalignment**: agents not communicating necessary information even when they possess it ("information withholding"), or acting on conflicting implicit assumptions.
3. **Task verification and termination problems**: a system lacking genuine verification, so an agent's self-report of success is trusted uncritically, the same "trust the narration, not the ground truth" failure mode you met with Replit in Lesson 03 and Lesson 05, now at a system level instead of a single-tool level.

The paper's own finding on remediation is the uncomfortable part: better role specification and better orchestration strategies each produced only partial improvement, meaning these are not quick prompt fixes. They require deeper system redesign, explicit verification steps, shared or traceable context, clearer termination conditions, not a better-worded system prompt for each agent.

### Project Vend's "CEO" sub-agent as a cautionary multi-agent case

Project Vend phase two added a "CEO" sub-agent and procedural gates on top of Claudius, and discounting dropped roughly 80%, a real improvement. But the agents still agreed to an illegal bulk-onion futures contract (blocked only by a human citing the 1958 Onion Futures Act) and mishandled a reported shoplifting incident by trying to "hire" a staff member as security below minimum wage. The lesson generalizes past Project Vend specifically: a same-model supervisor largely inherits the same blind spots as the agent it supervises. Adding a second agent in a supervisory role is not automatically a genuinely independent check; if it shares the base model's training and biases, it can rubber-stamp the same class of mistake the first agent would have made alone.

## In practice at Northwind

Northwind's SaaS-engineering counterpart (not Desk itself, but a plausible future Desk extension) considers an orchestrator-worker system to triage, research, and resolve customer-reported bugs across code, docs, and support tickets at 50-engineer scale. Before building it:

1. **Classify the actual task shape first.** Is bug triage-and-research genuinely breadth-first (several independent investigation threads that don't need to agree with each other) or tightly coupled (a fix proposal that must be internally consistent across code and docs)? Anthropic's sweet spot is the former; Cognition's failure case is closer to the latter.
2. **Estimate the token-cost multiplier against the value of faster triage**, concretely, before committing: a 4x-15x cost increase over a single well-tooled agent needs to be justified by a measured value difference, not assumed because "agents working together" sounds more capable.
3. **Test whether a single well-tooled agent with a good context strategy (Lesson 04) solves 80% of the task more cheaply first.** The MAST finding that multi-agent failure is a systems-engineering problem, not a capability problem, cuts both ways: a well-engineered single agent may already clear the bar multi-agent complexity was meant to clear.
4. **If you proceed, give each subagent the full upstream decision trace relevant to its subtask, not a one-line summary**, specifically to avoid Cognition's Flappy-Bird-style mismatch, and design an explicit verification step before any subagent's output is treated as final, specifically to avoid MAST's "trusted self-report" failure cluster.
5. **Design the termination condition before writing the delegation logic**, not after a loop runs long in testing: a max-handoff count and an explicit escalation path, directly reusing Lesson 05's loop-bounding discipline at the multi-agent level, since nothing about having several agents makes a runaway loop less likely; if anything, cross-agent handoff loops are a documented failure mode in their own right.

## What strong engineers know

- Anthropic's 90.2% improvement and Cognition's "don't build multi-agents" are not contradictory; they describe different task shapes (parallel-independent vs. tightly-coupled), and citing one without checking which shape your task actually is is a category error.
- The real cost multiplier (roughly 4x for a single agent, roughly 15x for multi-agent, per Anthropic's own production telemetry) has to be weighed against measured task value, not assumed away by analogy to cheap horizontal scaling of stateless services.
- MAST's finding that better role specification and better orchestration only partially fix multi-agent failure means the fix usually isn't a better prompt; it's explicit verification, shared or traceable context, and clearer termination conditions, structural changes, not wording changes.
- A same-model supervisor agent is not automatically an independent check; Project Vend's "CEO" sub-agent shared the base model's blind spots and still signed off on an illegal contract, so a genuinely adversarial or differently-sourced check matters more than adding a second agent of the same kind.
- "Information withholding" between agents that each individually possess the needed information is a named, specifically documented MAST failure mode, distinct from an agent simply not knowing something; diagnosing which one you're seeing changes whether the fix is "share more context" or "retrieve more data."
- A multi-agent handoff loop needs the same step/cost bounding discipline as a single-agent loop (Lesson 05); multiple agents handing off to each other indefinitely is a documented real failure shape, not a hypothetical edge case.
- Before reaching for multi-agent architecture, test whether a single well-tooled agent with disciplined context engineering already solves most of the task; multi-agent complexity should be earned by a demonstrated gap, not assumed as the more sophisticated default.

## Decide

Northwind is considering whether to rebuild Desk's shipment-investigation flow (currently a single agent, from Lesson 05) as an orchestrator-worker system: one lead agent delegating order-lookup, carrier-tracking, and policy-check subtasks to three specialist subagents, then synthesizing their findings into a resolution. Current single-agent performance resolves 70% of tickets correctly within the step cap; the remaining 30% time out or escalate. Options:

1. Rebuild as orchestrator-worker, betting that parallel specialist subagents resolve more of the 30% that currently time out.
2. Keep the single agent, but improve its context engineering (Lesson 04) and tool design (Lesson 03) first, and re-measure before considering multi-agent.
3. Build a small orchestrator-worker prototype on a 5% ticket sample, measure resolution rate and token cost against the current single-agent baseline, and decide based on the data rather than the architecture's appeal.
4. Reject multi-agent outright, citing Cognition's warning, without testing whether this specific task is closer to Anthropic's parallel-independent case or Cognition's tightly-coupled case.

Justify your choice against the real 4x-15x cost multiplier, the task's actual shape (are order-lookup, carrier-tracking, and policy-check genuinely independent, or does the final resolution require them to agree with each other), and what a wrong guess costs you in each direction.

## One sentence summary

> Multi-agent architecture pays off only for genuinely parallel, independent, high-value tasks at a real 4x-15x token-cost multiplier, and its documented failure modes (information withholding, vague delegation, untrusted self-report) require structural fixes, not better prompts.

## Check question

Northwind's prototype orchestrator-worker system for shipment investigation has a lead agent that delegates to a tracking subagent and a policy subagent, each returning a one-sentence summary of its findings to the lead for synthesis. On a recent ticket, the tracking subagent found the package was lost, and the policy subagent (never told this) recommended a standard delayed-shipment credit instead of a lost-package replacement. Which MAST failure category does this match, and what specific change to the delegation design (not the prompt wording) fixes it?

## Sources

- [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) · Anthropic · Jun 2025 · the 90.2% improvement, the 4x/15x token multiplier, and the orchestrator-worker pattern.
- [Don't Build Multi-Agents](https://cognition.ai/blog/dont-build-multi-agents) · Cognition (Walden Yan) · Jun 12, 2025 · the context-fragmentation and conflicting-implicit-decisions failure case.
- [Multi-Agents: What's Actually Working](https://cognition.ai/blog/multi-agents-working) · Cognition · ~2026 · the narrowed claim: don't build peer agents sharing mutable state without isolation.
- [Why Do Multi-Agent LLM Systems Fail?](https://arxiv.org/abs/2503.13657) · Cemri, Pan, et al. (UC Berkeley et al.) · Mar 2025 (rev. Oct 2025) · the MAST taxonomy, the 0.88 Cohen's Kappa, and the ChatDev 33.33% correctness finding.
- [Project Vend: Phase two](https://www.anthropic.com/research/project-vend-2) · Anthropic / Andon Labs · 2025 · the "CEO" sub-agent's shared blind spots despite the ~80% discounting improvement.
