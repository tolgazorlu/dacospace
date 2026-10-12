---
id: ai-support-agent-refunds
title: Make a refund-issuing support agent reliable
level: senior
topics: [ai, agents, reliability, idempotency]
minutes: 45
---

## Prompt

Design a customer support agent for a fintech that can issue refunds up to $500 autonomously, talking to real customers over chat, handling thousands of tickets a day. Focus on making it reliable and correct, not just secure.

## Clarifications

- **Volume?** ~5,000 tickets/day; the refund tool is invoked on ~15% of tickets.
- **Grounding?** Refund policy lives in a versioned internal doc store; the agent must cite the specific policy clause it used.
- **Ambiguous cases?** Any ticket where the agent's confidence is below an internal threshold must escalate to a human, not guess.
- **Infra?** The agent runs as a multi-turn conversation that can span minutes; the LLM provider has occasional multi-minute latency spikes or short outages.
- **Audit need?** Finance wants every refund tied to a ticket ID, policy citation, and full tool-call trace.
- **Known related failure?** A different company's support bot once fabricated a refund policy it never had, and the company was held to it.

## Follow-ups

- Two refund requests for the same ticket arrive within a second of each other, a user double-click or a retry. How does your design prevent a double refund?
- How do you detect, in production, that the agent is systematically over-refunding one customer segment, before finance notices on the monthly report?
- The LLM provider has an outage mid-conversation. What happens to a customer who is halfway through a refund flow?
- The policy document changes mid-rollout (a new return window). What's your plan for in-flight conversations that started under the old policy?

## Rubric

- Makes the refund tool idempotent (idempotency key per ticket/request) so retries or races cannot double-refund.
- Enforces the dollar ceiling server-side in the tool, not only via prompt instruction.
- Grounds every refund decision in retrieval with citation to the specific policy clause, and defines a confidence/ambiguity threshold that escalates to a human instead of guessing.
- Logs a full audit trail: ticket, tool calls, retrieved policy citation, and the model's stated justification.
- Designs for provider unavailability with durable conversation state, not in-memory-only, so a mid-conversation outage doesn't corrupt or duplicate a refund.
- Covers rollback/versioning when the underlying policy document changes mid-rollout.
- Names the key trade-off: automation coverage (handling more tickets without escalation) versus the cost of an incorrect autonomous refund, and how the confidence threshold is tuned against it.

## Pitfalls

- A system prompt describing the refund policy and a tool to issue refunds, with no enforcement outside the prompt and no plan for hallucinated policy claims.
- No idempotency design, so concurrent or retried requests can double-refund.
- In-memory-only conversation state with no durability across a provider outage.
- No detection mechanism for systematic drift (e.g. over-refunding one segment), relying on someone noticing manually.
