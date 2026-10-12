# Lesson 20 · When the provider goes down

**Reading time:** 17 min · **Module:** Production · **Concepts:** rate limits, provider outages, fallbacks, degradation modes
**Cases:** openai-dec-2024-outage

## The problem

On December 11, 2024, between 3:16pm and 7:38pm PST, ChatGPT, the OpenAI API, and Sora were significantly degraded or unavailable fleet-wide for about 4 hours and 22 minutes, OpenAI's longest outage to that point. The root cause, per OpenAI's own postmortem: a new telemetry service, deployed to all clusters to improve Kubernetes control-plane observability, caused every node to execute resource-intensive Kubernetes API operations whose cost scaled with cluster size. The largest clusters' API servers became overwhelmed, taking down the control plane. DNS caching delayed visibility of the problem as the rollout continued. Engineers were partly locked out of remediation because `kubectl` itself depends on a working control plane, the exact thing that had failed.

This was not a model problem, not a security breach, not a prompt injection. It was an infrastructure change at the provider, and it took down every application built on top of that provider for over four hours with no advance warning. If your product's revenue-critical feature calls a single LLM provider with no fallback, this incident is the canonical argument for why that is a production risk, not a hypothetical one.

## Why it is hard

A backend engineer's instinct for a dependency outage is retry with exponential backoff, maybe a circuit breaker. That instinct assumes the dependency recovers on its own timescale and that waiting is the correct move. Both assumptions break here.

Exponential backoff does nothing when the entire provider is down fleet-wide; you are not racing a transient blip, you are waiting out an infrastructure incident whose timeline you cannot predict and cannot influence. Watching the provider's status page is not an actionable fallback either, it tells you what you already know.

The harder, less obvious problem is that failover to a second LLM provider is not like failover between two replicas of the same database. Different model families behave differently: different system prompt conventions, different tool-calling formats, different latency and cost profiles, different failure modes of their own. A naive "just call provider B if provider A times out" strategy can silently degrade output quality or break tool schemas mid-conversation, trading a visible outage for an invisible correctness problem.

And there is a testing problem underneath all of this: you cannot wait for a real four-hour outage to find out whether your failover path actually works. It has to be tested deliberately, which most teams never get around to doing until the day they need it.

## The idea: graceful degradation, not just retries

### Why retries are not a fallback

A single-provider API call wrapped in retry-with-backoff handles transient errors, rate limit spikes, a dropped connection, a momentary 500. It does nothing for a sustained, fleet-wide outage like OpenAI's Dec 2024 incident, where the failure persists for hours regardless of how many times you retry. Treating "retry harder" as your outage plan means your product goes down for exactly as long as the provider does, with no mitigation of your own.

### Multi-provider fallback with health checks

The structural fix is a second provider (or a second model family within the same provider, where available) with automatic, health-checked failover, not a manual runbook step. This means: actively monitoring provider health (not just waiting for a call to fail), routing new requests to the healthy provider once the primary is confirmed down, and routing back once it recovers. This is architecturally the same pattern as any other critical SaaS dependency failover, applied to an LLM API.

### Degradation modes short of full failover

Full failover to a second model is not always available or desirable mid-session (switching model families mid-conversation can change behavior in ways users notice). Cheaper, often sufficient degradation modes:

- Serve a cached or last-known-good response for queries that are repeatable (an FAQ-style answer that does not need live generation).
- Switch to a read-only mode: let users browse what the system already knows, queue new generative requests rather than failing them outright.
- Queue and retry asynchronously with a clear "your request is being processed" state, rather than a hard error, for workloads that can tolerate delay.

### SLAs and runbooks that assume hours of unavailability

Because a provider outage can run for hours with no advance warning, incident-communication runbooks, internal SLAs, and customer-facing status messaging need to assume that duration as a real possibility, not an edge case. "We will investigate and get back to you" is not sufficient when the underlying dependency might be down for the better part of a business day.

### The cost of resilience

Keeping a warm standby on a second provider is not free: it means maintaining prompt and behavior parity across two different model families (or at minimum, verifying that the fallback path produces acceptable output, even if not identical), and potentially paying for capacity you use only during an outage. This is the real trade-off every design question in this space eventually reaches: how much of that cost is justified given how revenue-critical the feature is.

| Approach | What it costs | What it covers |
|---|---|---|
| Retry with backoff | Near zero | Transient errors, brief blips |
| Health-checked multi-provider failover | Ongoing parity/maintenance cost across two providers | Fleet-wide provider outages lasting hours |
| Cached/last-known-good degradation | Moderate (caching infra) | Repeatable queries during any outage |
| Queue + async retry | Moderate (queue infra, UX work) | Latency-tolerant workloads during any outage |
| Status-page watching | Zero cost, zero mitigation | Nothing; informational only |

## In practice at Northwind

Desk, Northwind's dealer and employee assistant, has a single LLM provider in its current design. Before building a fallback, decide which of Desk's functions are actually revenue-critical enough to justify the cost: dealer-facing order lookups and credit issuance, probably yes; the internal employee Slack document assistant, probably a lower bar, since employees can fall back to manual document search for a few hours without material business harm.

For the revenue-critical path, add a second provider with a health check that runs independently of user traffic, not one that only discovers the primary is down when a real user's request times out. Route new sessions to the healthy provider once the primary is confirmed unhealthy; do not try to switch model families mid-session for an existing conversation, since that risks a visible behavior change for a dealer in the middle of resolving an issue.

For queries that are repeatable and policy-based (return policy terms, standard pricing questions), keep a cached last-known-good answer path that degrades gracefully to "according to our last verified answer" rather than hard-failing when both providers are degraded. For anything involving an actual credit or order action, do not degrade to a guess; queue the request and tell the dealer it will be processed once service is restored, rather than letting a degraded model improvise a financial commitment.

Test the failover deliberately, on a schedule, not only in response to a real incident: simulate killing the primary provider mid-session in a staging environment and verify the health check detects it, the failover routes new requests correctly, and the degraded mode (cache or queue) engages for the request classes that need it. Log every failover event so you have a record of how often this actually triggers and how long each incident lasted, which also tells you whether the investment was worth it.

## What strong engineers know

- A provider outage is architecturally the same risk class as any other critical SaaS dependency going down for hours; LLM-specific thinking should not make you forget that lesson.
- Retry-with-backoff is correct for transient failures and completely useless for a sustained fleet-wide outage; know which failure mode you are actually mitigating.
- A health check that polls provider status independently of live traffic detects an outage faster than waiting for a user's request to time out.
- Failing over to a different model family mid-conversation can change behavior a user notices; prefer failing over at session boundaries, not mid-session, where possible.
- Graceful degradation (cache, read-only mode, queued async retry) is cheaper than full multi-provider parity and covers a meaningful share of outage scenarios without the ongoing cost of running two providers at parity.
- You cannot know your failover path works until you test it deliberately; waiting for a real outage to validate it is waiting for the worst possible time to find a bug.
- Not every feature needs the same resilience investment; decide which functions are revenue-critical enough to justify a second provider before building one for everything.
- Infrastructure-layer causes (Kubernetes, DNS, telemetry rollouts) can take down a provider with nothing wrong with the model itself; a well-designed fallback does not need to understand why the primary is down, only that it is.

## Decide

Northwind runs Desk's dealer-facing credit-issuance feature on a single LLM provider. Finance has asked what it would cost to add resilience against a multi-hour outage like OpenAI's December 2024 incident, and wants a recommendation before the next budget cycle. Options:

1. Do nothing beyond retry-with-backoff, and accept that a multi-hour provider outage means the credit-issuance feature is down for that duration.
2. Add a second provider with health-checked automatic failover for new sessions, maintaining prompt/behavior parity across both, at ongoing engineering cost.
3. Keep a single provider, but add a graceful-degradation path: queue credit requests during an outage and process them once service is restored, with no model fallback.
4. Add a second provider only as a manually-triggered failover (an on-call engineer flips a switch), avoiding the cost of automatic health checks but adding response latency during a real incident.

Pick one (or a combination) and justify it given that credit issuance is revenue-affecting but not safety-critical, and that Desk also serves a lower-priority internal document assistant that does not need the same investment.

## One sentence summary

> A single-provider LLM dependency carries the same multi-hour outage risk as any other critical SaaS dependency, and retrying harder does not substitute for a tested fallback.

## Check question

Desk's health check correctly detects that the primary provider is degraded and fails new sessions over to the secondary provider, but three dealers in the middle of an active credit-issuance conversation report the assistant "changed personality" and started asking questions it had already asked them. What did your failover design miss, and what would you change?

## Sources

- [API and ChatGPT & Sora Facing Issues, postmortem](https://status.openai.com/incidents/ctrsv3lwd797) · OpenAI · Dec 2024 · primary postmortem, root cause and timeline
- [OpenAI blames its massive ChatGPT outage on a 'new telemetry service'](https://techcrunch.com/2024/12/13/openai-blames-its-massive-chatgpt-outage-on-a-new-telemetry-service) · TechCrunch · Dec 2024 · independent cross-check of the postmortem
