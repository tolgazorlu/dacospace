---
id: unique-id-generator
title: Design a unique ID generator
level: junior
topics: [distributed-ids, sharding]
minutes: 45
---

## Prompt

Design a service that generates unique IDs for rows being created across a distributed database, where a simple auto-increment column no longer works.

## Clarifications

- **Scale?** 50,000 IDs generated per second at peak across the whole system, average 8,000/sec.
- **Number of ID-generating nodes?** 20 application servers can each request IDs independently; they must never hand out a duplicate.
- **Ordering requirement?** IDs should be roughly time-sortable (newer IDs are numerically larger than older ones) to keep database index locality reasonable, but strict global ordering across servers is not required.
- **Format?** A 64-bit integer, to fit existing primary key columns without a schema change.
- **Latency requirement?** Generating an ID must add no more than 1ms to the request that needs it, and must not require a network round trip to a central service per ID.
- **Durability?** If a server crashes and restarts, it must not reuse an ID it already handed out.

## Follow-ups

- Two servers are generating IDs in the same millisecond. How do you guarantee they never collide without talking to each other per ID?
- A server's clock drifts backward by 2 seconds (NTP correction). How does that affect your design, and how do you prevent it from producing a duplicate or out-of-order ID?
- Scale from 20 servers to 2,000. Does your ID format still have enough room?
- A downstream system wants to extract the approximate creation time from the ID alone, without a database lookup. Does your format support that?

## Rubric

- Proposes a Snowflake-style composite ID: a bit layout combining a timestamp, a machine/worker id, and a per-millisecond sequence number, and justifies the bit widths against the stated scale (e.g. enough sequence bits for 50,000/sec peak with headroom, enough machine-id bits for growth beyond 20 servers).
- Names the key trade-off: embedding a machine id to avoid any coordination per ID (fast, no network call, but requires a mechanism to assign unique machine ids) versus a centralized ID-issuing service or database sequence (simpler per-ID logic, but a network round trip and a potential bottleneck/SPOF, violating the 1ms no-round-trip requirement here).
- Addresses machine id assignment: how each of the 20 (and eventually more) servers gets a unique machine id without manual coordination, e.g. via a coordination service like Zookeeper/etcd, or a config-assigned id with a startup check for conflicts.
- Covers clock issues: detecting backward clock drift and refusing to generate IDs (or waiting) rather than risking a duplicate or out-of-order id for that window.
- Confirms 64 bits is enough by doing the bit-budget math: e.g. 41 bits timestamp (about 69 years at millisecond resolution), 10 bits machine id (1024 machines), 12 bits sequence (4096 per millisecond per machine, comfortably above the 50,000/sec / 20 servers ≈ 2,500/sec/server peak).
- Mentions that IDs are only roughly, not strictly, globally ordered across machines, and that this is acceptable per the stated requirement.

## Pitfalls

- Proposing a single centralized counter service without acknowledging it becomes a bottleneck or SPOF, directly contradicting the no-network-round-trip requirement.
- Using UUIDs without addressing that they are not time-sortable and hurt database index locality, when the requirement explicitly asks for rough time ordering.
- Not doing the bit-budget arithmetic, so the sequence or machine-id space turns out too small for the stated scale without the candidate noticing.
- No handling for clock drift, assuming server clocks are always monotonic and synchronized.
