---
id: ai-long-running-research-agent
title: Design a long-running research agent
level: senior
topics: [ai, agents, context-management, multi-agent]
minutes: 45
---

## Prompt

Your company wants an AI research agent that can run for hours: given a broad question, it searches the web and internal documents, reads dozens of sources, and writes a synthesized report. Design the system, with particular attention to what happens as the task runs long.

## Clarifications

- **Typical task length?** 30 minutes to 4 hours of wall-clock time, tens to low hundreds of tool calls (search, fetch, internal doc read).
- **Context growth?** Sessions that started at a few thousand tokens have grown past 100K tokens as more search results and intermediate notes accumulate.
- **Failure observed?** Tasks that worked reliably last month now fail or drift off-topic, despite no token-limit errors being hit.
- **Architecture considered?** Either a single agent with a large context window, or a lead agent that spawns parallel subagents per sub-topic.
- **Cost ceiling?** $10 per completed report is the target; current runs sometimes exceed $40.
- **Output requirement?** Every claim in the final report must be traceable to a specific retrieved source.

## Follow-ups

- A report comes back confidently citing a source that, on inspection, doesn't actually say what's claimed. How do you catch that class of error systematically, not just this one case?
- Someone proposes "just switch to a model with a bigger context window" to fix the degraded-task problem. Why might that not fix it?
- You decompose into a lead agent plus parallel subagents. Two subagents silently duplicate the same investigation. How do you detect and prevent that?
- Leadership wants reports in 10 minutes instead of 4 hours. What architectural change does that force, and what does it cost in quality or token spend?

## Rubric

- Diagnoses long-session quality decay as context rot, performance degrading with input length even below the nominal token limit, distinct from simply hitting a hard context ceiling.
- Proposes compaction, tool-result clearing, and external memory to actively shrink what stays in-window, rather than only requesting a larger context window.
- Weighs single-agent-with-good-context-engineering against a lead/subagent architecture using the actual task shape: breadth-first and parallelizable favors multi-agent, tightly coupled/sequential favors single-agent.
- If multi-agent, quantifies the token-cost multiplier of running several agents against the value of faster or broader coverage, and designs explicit task boundaries per subagent to avoid duplicated work.
- Builds a citation/entailment check, does the retrieved source actually support the claim, not just "a URL was cited."
- Designs a regression test or eval for context rot specifically (accuracy vs. input length), separate from an end-to-end quality score.
- Addresses cost ceilings and what happens when a run is trending over budget mid-task.

## Pitfalls

- Treating "the task got harder" the same as "the context window got smaller" and fixing both with a bigger context window.
- Reaching for a multi-agent architecture because it "sounds more powerful" without first testing whether a single well-tooled agent handles most of the workload more cheaply.
- No mechanism to verify that cited sources actually support the claims made about them.
- No boundary or cost ceiling, so a long-running task can silently run far past its budget before anyone notices.
