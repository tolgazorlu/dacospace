---
id: ai-coding-agent-sandbox
title: Design a sandbox for an unattended coding agent
level: senior
topics: [ai, security, agents, sandboxing, blast-radius]
minutes: 45
---

## Prompt

Your company wants to give a coding agent shell and file-system access to run unattended overnight against a staging environment, generating and merging small PRs. Design the sandbox and the controls around it.

## Clarifications

- **Scope of access requested?** Full shell, file read/write, and git push to a staging-tracked branch; no direct production credentials.
- **Volume?** ~20 overnight runs/night, each budgeted at $5 and 150 agent steps.
- **Trigger?** Runs start automatically from a queue of small, well-scoped tickets (dependency bumps, test-flakiness fixes).
- **What's the actual blast radius if it goes wrong?** Worst case discussed so far is a runaway loop burning API budget, or a destructive file operation in staging.
- **Review requirement?** Every PR must be reviewed by a human before merge; the agent cannot merge its own PR.
- **Today's control?** The team wants to add `--trust-all-tools --no-interactive` flags to speed up the pipeline, removing the one approval prompt that currently exists.

## Follow-ups

- The agent reports a file deletion was "irreversible." Do you trust that claim, and how would your design let you verify it independently?
- A dependency update the agent pulled in is later found to be poisoned. What's the actual blast radius of `--trust-all-tools` in your current environment?
- A retry loop starts triggering on a flaky test with slightly different error text each time, so naive duplicate-detection never fires. How does your design stop it before it burns the night's budget?
- Someone wants to extend this agent to touch production during business hours, "just for read-only diagnostics." What changes, and what doesn't?

## Rubric

- Treats environment separation (the agent literally cannot reach production credentials, network-restricted) as a non-negotiable, not a policy statement.
- Rejects `--trust-all-tools`/no-approval-gate flags for unattended runs in favor of sandboxing (ephemeral, network-restricted containers) as the actual substitute control.
- Enforces a hard per-run cost ceiling and step-count limit in code, checked before each tool call, not just described in a prompt.
- Does not trust the agent's self-reported claims about irreversibility or success; requires an independent, external audit log or snapshot as ground truth.
- Separates duties so no single external contribution (a poisoned dependency, a crafted PR comment) can both modify the agent's behavior and control what ships.
- Designs idempotency and loop-termination for destructive or retried operations (max steps, cost ceiling, semantic-equivalence check on repeated failures), not identical-string retry detection only.
- Covers audit logging sufficient to reconstruct exactly what happened, independent of the agent's narration.

## Pitfalls

- "We told it not to touch prod in the system prompt" as the sole control, with no infrastructure-level enforcement.
- Accepting the agent's own status report ("rollback not possible") as fact without an independent check.
- Treating unattended/CI context as exempt from approval-gate reasoning because "no human is around to approve anyway."
- No bound on retry loops that look different on the surface but are semantically the same failure.
