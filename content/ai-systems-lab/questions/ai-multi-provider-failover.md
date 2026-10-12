---
id: ai-multi-provider-failover
title: Design multi-provider failover for an LLM-dependent product
level: senior
topics: [ai, production, reliability, failover]
minutes: 45
---

## Prompt

Your customer-facing product relies entirely on a single LLM API provider. Design a failover architecture so a multi-hour, fleet-wide outage at that provider does not take your product down with it.

## Clarifications

- **Current state?** One provider, one model family, direct API calls from the application, retries with exponential backoff on failure only.
- **Business impact of downtime?** The feature is revenue-critical; every hour of full unavailability is measured in real customer-facing impact, not just inconvenience.
- **Outage shape to plan for?** A provider-wide outage lasting 4+ hours with no advance warning, not a single failed request.
- **What's acceptable during an outage?** Degraded service, cached answers, read-only mode, queuing, is acceptable; a hard failure with no response is not.
- **Constraint?** Prompts and behavior must stay reasonably consistent whether running on the primary or the fallback provider.

## Follow-ups

- What breaks, specifically, when you fail over to a different model family mid-conversation, and how do you handle it?
- How do you test this failover path for real, without waiting for an actual multi-hour outage to happen?
- The fallback provider is also showing elevated error rates during the primary's outage, because other companies are failing over to it too. What's your plan?
- What's the added baseline cost of keeping a second provider warm and ready, and how do you justify it against the probability and cost of an outage?

## Rubric

- Designs automatic health-checked failover to a second provider, not just retrying the same provider with backoff, which does nothing when the whole provider is down.
- Proposes graceful degradation paths (cached/last-known-good answers, read-only mode, request queuing) for the window where no provider is healthy, rather than a hard failure.
- Addresses prompt/behavior portability across providers: what has to be re-tuned or re-tested when the model family changes, and what stays the same.
- Has a concrete plan for testing the failover path without waiting for a real outage, fault injection, scheduled drills.
- Covers the realistic scenario where the fallback provider is also degraded during a major outage, correlated failure, not just the case where it's perfectly healthy.
- States the cost/complexity of keeping a warm standby on a second provider and makes an explicit case for why it's worth it given the stated business impact.
- Includes incident communication/runbook expectations that assume an outage can last hours, not minutes.

## Pitfalls

- "We'll just retry with exponential backoff," which does nothing against a fleet-wide outage of the only provider in use.
- "We'll wait for the provider's status page," with no actionable fallback in the meantime.
- Assuming the fallback provider will be healthy during a major outage, ignoring correlated failure risk.
- No tested failover path; the design exists only on paper until the first real outage.
