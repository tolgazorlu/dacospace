---
id: ai-safe-model-upgrade-rollout
title: Safely roll out a model swap for a production agent
level: senior
topics: [ai, evals, rollout, reliability]
minutes: 45
---

## Prompt

Your team wants to swap the model behind a production customer-service agent, either to a newer version of the same frontier model or to a cheaper model, to cut cost. Design how you decide whether it's safe to ship, and how you roll it out.

## Clarifications

- **Current state?** The agent has a 90% task-success rate on your offline eval set; real production traffic is far more varied than that set.
- **Candidate change?** Either a frontier model version bump, or a smaller/open-weight model that's roughly 95% cheaper but scored 8 percentage points lower on your tool-calling benchmark in initial testing.
- **Risk surface?** The agent handles policy-sensitive actions (refunds, account changes); a regression here is customer-visible immediately.
- **Known reliability issue?** Even strong models can go from roughly 60% success on a single try to well under 25% success across several repeated-but-varied real tasks of the same type.
- **Rollout tooling available?** Feature-flaggable traffic split, with the ability to route a percentage of sessions to the candidate model.
- **Timeline pressure?** Finance wants the cost change live this quarter; engineering wants at least one full rollback-tested cycle before 100% rollout.

## Follow-ups

- A single offline benchmark score moved in the right direction. What additional evidence would you require before approving this for even 5% of production traffic?
- Your rollback trigger fires three days into a 10% rollout. Walk through exactly what happens next, end to end.
- How would you measure "does it work consistently across many similar real tickets," not just "does it work once," without replaying real customers' tickets multiple times?
- The candidate model is 8% worse on your benchmark but 95% cheaper. How do you frame that trade-off for leadership in a way that isn't just "benchmark score vs. price"?

## Rubric

- Distinguishes pass@1 (works once) from repeated/varied-task reliability, and insists on evidence closer to the latter before trusting a single offline benchmark number for a launch decision.
- Designs a staged rollout with escalating traffic percentage tied to measured reliability thresholds, not a fixed calendar date.
- Defines a concrete rollback trigger (a specific metric and threshold) before rollout starts, and verifies the rollback mechanism actually works before relying on it.
- Runs the same red-team/policy-adherence suite against both the current and candidate model, reporting a utility delta and a safety/policy-violation delta separately, not a single blended score.
- Frames the cost/quality trade-off for leadership with both numbers side by side (percentage-point quality delta vs. percentage cost delta) rather than picking one dimension.
- Covers what happens to in-flight conversations during a traffic-split transition (consistency of behavior mid-session).
- Names at least one thing that must be re-verified after the swap even if the aggregate score looks fine (tool-call schema compliance, specific policy edge cases).

## Pitfalls

- Approving a model swap off one offline benchmark number without testing repeated-task reliability or policy adherence specifically.
- No predefined rollback trigger; deciding whether to roll back only after complaints arrive.
- Comparing cost and quality as if they're the same unit, collapsing a real trade-off into a single "better/worse" verdict for leadership.
- No plan for mid-session consistency during a gradual traffic-split rollout.
