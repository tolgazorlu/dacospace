---
id: url-shortener
title: Design a URL shortener
level: junior
topics: [hashing, databases, caching]
minutes: 45
---

## Prompt

We want a service like a URL shortener: a user submits a long URL and gets back a short one that redirects to the original. Design the system.

## Clarifications

- **Scale?** 100 million new short URLs created per month, 10:1 read-to-write ratio, so about 1 billion redirects per month.
- **Peak traffic?** Writes average about 40/sec, peak 5x to 200/sec. Reads average about 400/sec, peak 2000/sec.
- **Short code length?** 7 characters from [a-zA-Z0-9], giving 62^7 (about 3.5 trillion) possible codes, far more than the 1.2 billion codes needed over 10 years at this rate.
- **Custom aliases?** Users can optionally request a custom alias; must be unique, checked at write time.
- **Expiration?** Links expire after 5 years by default unless the user pins them; expired links return 404 instead of redirecting.
- **Redirect type?** 302 (temporary) redirect so click analytics can be collected server-side on every hit.
- **Data retention?** Store creation timestamp, original URL, owner id (nullable for anonymous), and click count.

## Follow-ups

- How would you generate unique short codes without a central counter becoming a bottleneck at 200 writes/sec?
- A short code's redirect target needs to change (user edits the destination). How does caching interact with that?
- Traffic to one viral link spikes to 50,000 redirects/sec. What breaks first and how do you fix it?
- How do you detect and reject malicious or spam URLs at creation time without adding much write latency?

## Rubric

- Proposes a concrete short-code generation strategy (base62 of an auto-increment id, or pre-generated key pool distributed by a key-generation service) and explains the collision/uniqueness guarantee.
- Identifies the read path as the hot path and designs a cache (e.g. Redis) in front of the database with cache-aside invalidation on updates.
- Names the core trade-off: encoding a counter (compact, no collisions, but needs a coordination service or sharded counters) versus random generation with collision retries (simpler, but needs a uniqueness check per write).
- Covers database choice and schema: key-value store or indexed relational table keyed by short code, with read replicas for scale.
- Addresses the hot-link problem (CDN or edge cache for extremely popular redirects, or sharding by code prefix).
- Mentions analytics/click counting should not sit synchronously in the redirect critical path (async increment or write-behind).

## Pitfalls

- Using a single auto-increment counter in the primary database without discussing how it becomes a write bottleneck or single point of failure.
- Forgetting that custom aliases and generated codes share the same namespace and must both be checked for uniqueness.
- Designing 301 permanent redirects without noticing it breaks click analytics (browsers cache permanent redirects).
