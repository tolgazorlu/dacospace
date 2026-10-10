# Question format

One file per question: `questions/<id>.md`, where `<id>` is kebab-case and
matches the `id` field. Everything is English.

Questions must feel like a real 45-minute system design interview: the
opening prompt is short and deliberately underspecified, and the candidate
is expected to ask for the details. Do not invent claims such as "asked at
Google"; describe the problem, not its provenance.

```markdown
---
id: rate-limiter
title: Design a rate limiter for a public API
level: mid            # junior | mid | senior
topics: [rate-limiting, redis, distributed-counters]
minutes: 45
---

## Prompt

What the interviewer says out loud. 2-4 sentences. Vague on purpose.

## Clarifications

- **Who are the clients?** Third-party developers using API keys, about 50k keys.
- **Scale?** 20k requests/second at peak across all keys.
- (4-7 bullets. Each: a question a strong candidate asks, then the
  interviewer's concrete answer, with numbers wherever possible.)

## Follow-ups

- (3-5 bullets. Deep-dive questions the interviewer asks after the
  high-level design: failure modes, scale x10, consistency, cost.)

## Rubric

- (5-7 bullets. What a strong answer contains, concrete and checkable.
  Mention the key trade-off by name.)

## Pitfalls

- (2-4 bullets. Common mistakes that cost points.)
```

Rules:

- Exactly these five `##` sections, in this order.
- Frontmatter keys exactly: id, title, level, topics, minutes.
- Numbers in clarifications must be internally consistent (QPS vs DAU etc.).
- No emoji.
