---
id: rate-limiter
title: Design a rate limiter for a public API
level: mid
topics: [rate-limiting, redis, distributed-counters]
minutes: 45
---

## Prompt

Design a rate limiter that sits in front of a public API and stops any single client from overwhelming the backend. Assume it needs to work across many API servers.

## Clarifications

- **Who are the clients?** Third-party developers using API keys, about 50,000 active keys.
- **Scale?** 20,000 requests/second at peak across all keys, average 4,000 requests/second.
- **Limit granularity?** Per API key, default 100 requests per minute, with a separate premium tier at 1,000 requests per minute.
- **Deployment?** 30 stateless API server instances behind a load balancer, so the limiter state cannot live only in one process's memory.
- **Behavior on limit breach?** Return HTTP 429 with a `Retry-After` header; do not queue or delay requests.
- **Accuracy requirement?** Approximate is fine, up to about 5% overcounting tolerated, but undercounting (allowing way more than the limit) is not.
- **Latency budget?** The rate-limit check itself must add no more than 2ms at p99.

## Follow-ups

- Redis is your shared counter store and it goes down for 10 seconds. What happens to traffic during that window?
- A client is right at the edge of two fixed one-minute windows and sends double their limit across the boundary. How do you fix that with the sliding window problem?
- Scale to 500,000 API keys and 200,000 requests/second. Does your Redis-based design still work, and if not, what changes?
- How would you support a per-endpoint limit in addition to the per-key limit, e.g. a stricter limit on a write-heavy endpoint?

## Rubric

- Picks a concrete algorithm (token bucket, sliding window log, or sliding window counter) and explains why it was chosen over fixed window for burst behavior.
- Names the key trade-off explicitly: accuracy and fairness (sliding window log, more memory and CPU) versus cost and simplicity (fixed window or token bucket, cheaper but allows boundary bursts).
- Proposes a shared, low-latency counter store (Redis with atomic INCR/EXPIRE or a Lua script) so all 30 API servers agree on state.
- Addresses the single point of failure: fail-open versus fail-closed when Redis is unavailable, and states which one this system should choose and why.
- Discusses where the limiter runs (API gateway/middleware versus embedded in each service) and the latency implication of a network hop to Redis.
- Covers how limits are configured per key/tier and how that config is distributed to enforcement points without a restart.

## Pitfalls

- Proposing in-memory counters per server without addressing that 30 servers would each allow the full limit, multiplying the effective limit by 30.
- Choosing fixed window counters without acknowledging the boundary-burst problem when asked.
- No answer for what happens when the shared store (Redis) is down; silently assuming it is always available.
- Ignoring the latency budget and proposing a design that requires multiple round trips to the store per request.
