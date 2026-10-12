---
id: ai-llm-gateway-routing-caching-budgets
title: Design an LLM gateway with routing, caching and budgets
level: senior
topics: [ai, production, gateway, cost, caching, routing]
minutes: 45
---

## Prompt

Your company's combined LLM API bill is $75,000/month, split between a latency-sensitive customer chatbot and a large, latency-tolerant batch document-classification pipeline. Finance wants a 40% cost reduction with no quality regression. Design an LLM gateway that gets you there.

## Clarifications

- **Traffic split?** Chatbot: ~2M requests/month, p99 latency budget 2 seconds. Batch classification: ~10M documents/month, no real-time latency requirement.
- **Current setup?** Every request goes directly to the same frontier model, no caching, no routing by difficulty.
- **System prompt stability?** The chatbot's system prompt and tool definitions are mostly static, with a small amount of per-user dynamic content inserted at the end of each request.
- **Quality bar?** Any cost-saving change must be measured against an accuracy/quality baseline before and after; a regression is not acceptable even if it saves money.
- **Governance ask?** Finance wants a per-team cost ceiling, not just an overall bill, enforceable without code changes by each team.

## Follow-ups

- How do you detect that your prompt cache's hit rate silently dropped to zero after someone changed the prompt template to include a timestamp?
- How would you validate that your cheap/expensive model router isn't systematically misrouting a specific category of hard queries to the weak model?
- A team blows past its monthly budget ceiling on day 20. What does your gateway do: hard stop, degrade, or alert and let them keep spending?
- Six months later, a new model generation is 30% cheaper at the same quality. How does your gateway let you adopt it without a redeploy of every team's integration?

## Rubric

- Separates the two workloads by their actual constraints: moves the batch classification pipeline to a batch/async API tier for its discount, while keeping the chat path on the real-time tier.
- Adds prompt/context caching for the chatbot's stable system prompt and tool definitions, with dynamic per-user content placed after the cache breakpoint so it doesn't break the cache.
- Introduces a cost-aware router/cascade (cheap model first, escalate to expensive model on low confidence or detected difficulty) and measures the accuracy delta per routing decision, not just the cost delta.
- Designs per-team budget ceilings enforced centrally at the gateway, not per-application code, with a defined behavior when a ceiling is hit.
- Builds monitoring for cache hit rate and router accuracy as first-class metrics, since both can silently degrade to zero while the dashboard still looks healthy on cost alone.
- States the measurement plan for "no quality regression": a before/after quality eval tied to each cost-saving change, not just a cost delta reported alone.
- Names the trade-off explicitly: a cheaper/cascaded path saves money but adds latency, complexity, and a real, if small, risk of misrouting; states what's acceptable here.

## Pitfalls

- "Switch everything to the cheapest model" with no quality measurement.
- "Cache everything" without checking cache-prefix stability; a timestamp or request ID before the cache breakpoint silently kills the hit rate.
- A router with no accuracy monitoring, so a systematic misrouting of hard queries to the cheap model goes undetected.
- A single company-wide cost dashboard with no per-team ceiling, so the 40% target is chased in aggregate while one team's inefficiency is invisible.
