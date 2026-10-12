---
id: ai-bank-ai-platform-capstone
title: Design the AI platform for a 5,000-employee bank
level: senior
topics: [ai, platform, security, evals, knowledge, production, governance]
minutes: 60
---

## Prompt

You're the staff engineer asked to design the AI platform for a 5,000-employee bank: one platform that multiple business units, retail support, fraud review, internal engineering, and compliance research, will build AI features on top of. Walk through the platform's architecture, from the model and tool layer up through security, evaluation, and governance.

## Clarifications

- **Business units and use cases?** Retail customer support (chat, policy Q&A, limited account actions), a fraud-review assistant (summarizes cases for human analysts, never decides autonomously), an internal coding agent for engineering, and a compliance research assistant over regulatory documents.
- **Regulatory context?** The bank is subject to strict regulatory obligations, data residency, auditability, model risk management, and EU customers trigger EU AI Act obligations for some features.
- **Data sensitivity?** Customer PII, account data, and internal case files are all in scope for at least one use case; strict tenant/business-unit isolation is required internally.
- **Current state?** Each business unit has been prototyping independently with different vendors, different logging, and no shared security review.
- **Scale target?** The platform must support at least 10 business-unit teams building on it within 18 months, with a shared on-call rotation for platform-level incidents.
- **Board-level ask?** A single governance answer the CISO and Chief Risk Officer can both sign off on, plus a cost ceiling the CFO can hold teams to.

## Follow-ups

- The fraud-review assistant reads case notes that include customer-submitted text, an untrusted-input channel, and has access to account data. Walk through the specific risk this creates and how the platform's shared controls address it versus what each team must still do itself.
- A single frontier-model provider has a multi-hour outage. Which of your four use cases can degrade gracefully, and which cannot, and why?
- The compliance research assistant cites a regulation that was superseded last month. Whose eval/observability layer should have caught that, and how?
- 18 months in, a new business unit wants to onboard a "super-agent" with access to all four domains at once, to save integration work. What does the platform's design let you say no to, and why?
- The CRO asks for one number representing "how safe is our AI estate" for the board. What do you actually give them, and what do you refuse to collapse into one number?

## Rubric

- Designs a shared platform layer (model/tool gateway, logging, identity) that every business unit builds on, so security, audit, and cost controls are enforced centrally rather than reinvented per team.
- Applies least-privilege/capability scoping per use case explicitly: narrow, task-specific agents per business unit rather than one broad super-agent, and states why that matters for provable security guarantees.
- Treats any business-unit input that originates outside the bank's trust boundary (customer messages, case notes) as untrusted data, with the platform providing structural containment (capability limits, human approval gates for consequential actions) rather than relying on per-team prompting discipline.
- Builds a shared eval/observability layer that still allows per-use-case failure taxonomies (policy correctness for support, retrieval freshness for compliance research, tool-call correctness for the coding agent), not one blended quality score for the whole estate.
- Designs for provider/vendor failure with graceful degradation appropriate to each use case's risk profile, explicitly stating that not all four use cases can or should degrade the same way.
- Addresses governance and audit as an ongoing, owned process (risk classification per use case, re-classification triggers, audit trail) that the CISO and CRO can both rely on, distinct from one-time vendor certifications.
- Gives the CFO a per-team cost ceiling enforced at the platform layer, with routing and caching strategies available to every team rather than ad hoc per team.
- Explicitly refuses to collapse security, quality, and compliance into a single board-level number, and states what the board should see instead: a small set of concrete, owned metrics per risk category.

## Pitfalls

- Designing one shared super-agent with broad access across all four business units for efficiency, without acknowledging that this concentrates blast radius and cannot get the same security guarantees as scoped, narrow agents.
- A single platform-wide quality score that hides which business unit or failure mode is actually driving a regression.
- Treating a vendor compliance certification or a purchased guardrails product as sufficient governance for a regulated bank, with no internal risk classification or audit trail.
- No differentiated failure/outage plan per use case, assuming all four business units can degrade the same way during a provider outage.
- Letting each business unit choose its own logging/observability approach, making a cross-platform incident investigation impossible.
