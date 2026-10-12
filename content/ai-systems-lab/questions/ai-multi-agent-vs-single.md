---
id: ai-multi-agent-vs-single
title: Choose between a single agent and a multi-agent system
level: senior
topics: [ai, agents, multi-agent, architecture]
minutes: 45
---

## Prompt

A SaaS company wants to build a system that triages, researches, and proposes fixes for customer-reported bugs, pulling from code, docs, and support tickets, for an engineering org of about 50 people. The team is debating a single well-tooled agent versus an orchestrator with several specialist subagents. Walk through how you'd decide and what you'd build.

## Clarifications

- **Volume?** ~200 new bug reports/week; the system should propose a draft fix or root-cause summary within an hour for most of them.
- **Task shape?** Some bugs need breadth (search many files/services to find where an error originates); others need a tight, sequential chain (reproduce, then fix, then verify).
- **Budget?** Current single-agent cost per bug is ~$0.80; an early multi-agent prototype costs 4x-15x more per bug.
- **Review requirement?** Every proposed fix goes to a human engineer before merge; nothing auto-merges.
- **Day-one testing?** The team has fewer than 20 hand-labeled example bugs to evaluate against.

## Follow-ups

- How would you detect two subagents silently duplicating the same investigation before it wastes budget?
- The lead agent, on one bug, spawns 15 subagents for what should have been a 2-subagent job. What's your fallback?
- How do you evaluate this system credibly with only 20 labeled examples on day one?
- Six months in, the single-agent version your team almost shipped instead would have cost 10x less. Leadership asks whether the multi-agent investment was worth it. What evidence would answer that?

## Rubric

- Quantifies whether the task is genuinely breadth-first/parallelizable, the pattern multi-agent systems suit, versus tightly coupled/sequential, where multi-agent coordination overhead loses, rather than deciding by default.
- States the token-cost multiplier explicitly and weighs it against the actual value delivered (faster triage, broader coverage), not against "more powerful" as a vague justification.
- Designs explicit task boundaries and output formats per subagent so work isn't duplicated and outputs can be merged deterministically.
- Adds a verification/citation step before any proposed fix reaches a human, regardless of architecture.
- Proposes how to evaluate the system meaningfully with very few labeled examples (targeted error analysis, synthetic variants, staged rollout) rather than waiting for a large eval set.
- Names decomposition risks specific to multi-agent systems: data passed between agents losing implicit context or decisions made upstream, and silent duplicate work.
- Gives a concrete decision criterion for when to escalate from single-agent to multi-agent, not "always start with multi-agent" or "never use it."

## Pitfalls

- Choosing multi-agent because "agents working together" sounds more powerful, without first testing whether a single agent with a good context strategy covers most of the workload.
- No plan to detect duplicated work between subagents.
- Ignoring the token-cost multiplier when sizing the business case.
- Evaluating the system only on overall task success, missing that subagents handed off incomplete context to each other, an outcome that "worked" for the wrong reason.
