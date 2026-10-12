---
id: ai-durable-agent-execution
title: Design durable execution for a crash-prone agent
level: senior
topics: [ai, agents, durability, idempotency]
minutes: 45
---

## Prompt

Your coding agent runs multi-step tasks (clone, edit, test, commit) that can take ten-plus minutes and involve side-effecting actions. Right now, if the worker process crashes or is killed mid-task, the whole task restarts from scratch, sometimes repeating side effects. Design a durable execution layer for this.

## Clarifications

- **Typical task?** 5-10 discrete steps, each calling a tool with a real side effect (file write, git commit, API call to a ticketing system).
- **Crash frequency?** Worker processes get killed/restarted on roughly 1-2% of long-running tasks (deploys, OOM, spot-instance reclaim).
- **Current failure mode?** On restart, the agent redoes all steps from step 1, including side effects that already happened (duplicate commits, duplicate ticket comments).
- **Also observed?** A flaky downstream API fails with slightly different error text each time, so naive identical-retry detection never catches the loop, and a run has burned $40 of budget before anyone notices.
- **Requirement?** After a crash and restart, no side-effecting tool call should run twice, and the task should resume rather than restart.

## Follow-ups

- Walk through exactly what happens, step by step, when the process is killed between step 4 and step 5 of a 7-step task, and the worker restarts.
- How do you tell the difference between "the agent is doing a legitimately long multi-step task" and "the agent is stuck in a loop" automatically?
- The flaky API's error text varies on every call. How does your design still recognize this as the same repeated failure and stop it?
- Now add human approval before any destructive step. How does that interact with your durability design, given the task might wait hours for a human to respond?

## Rubric

- Proposes a durable-execution pattern (event log plus replay, or a workflow engine) so a crash resumes from the last completed step instead of restarting from step 1.
- Makes every side-effecting tool call idempotent (idempotency key per step/run) so replay after a crash cannot duplicate a real-world effect.
- Enforces a hard step-count and cost ceiling checked before each call, independent of the model's own judgment about whether to continue.
- Designs loop/stuck-task detection based on semantic equivalence of failures (same error category) rather than exact string matching, so varied error text doesn't defeat detection.
- Treats a human-approval pause as a first-class durable state, not a blocking in-memory wait, so the task can sit for hours without losing progress.
- Logs enough state that "what actually happened" can be reconstructed from the log, independent of what the agent claims happened.
- Names the trade-off between replay simplicity (coarse-grained checkpoints) and side-effect safety (fine-grained idempotency per tool call).

## Pitfalls

- Treating crash recovery as "just retry the whole task," ignoring that side effects already executed.
- Loop/stuck detection based on exact-match retries, which a flaky API with varying error text defeats trivially.
- No persisted state for a pending human approval, so a crash during the wait loses the task entirely.
- No cost ceiling enforced in code, relying on the agent to "decide" to stop.
