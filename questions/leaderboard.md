---
id: leaderboard
title: Design a real-time leaderboard for a mobile game
level: mid
topics: [sorted-sets, caching, real-time-updates, sharding]
minutes: 45
---

## Prompt

A mobile game wants a global leaderboard showing the top 100 players and
letting any player see their own rank. Scores update constantly as people
play. Design the system behind it.

## Clarifications

- **Scale?** 8 million daily active players, 40 million score-update events/day, peak 3,000 updates/second.
- **Read pattern?** Top-100 view fetched 500,000 times/day; "my rank" lookup fetched 2 million times/day.
- **Staleness tolerance?** Top-100 list can be up to 5 seconds stale; a player's own rank should reflect their latest score within 2 seconds.
- **Score range?** Integer scores from 0 to 10,000,000, ties broken by earliest achievement time.
- **Leaderboard scope?** Global leaderboard plus per-region leaderboards for 6 regions, each needing the same top-100 and rank-lookup behavior.
- **Reset cadence?** Leaderboard resets weekly; historical top-100 snapshots are kept for past weeks.
- **Write size?** Each update is a single player's new score, not a batch.

## Follow-ups

- A player's rank lookup needs to say "you are #45,213 out of 8,000,000". How do you compute that rank efficiently without scanning the full set?
- Scale score-update events to 30,000/second during a global tournament. What changes in your design?
- Two players submit updates that would tie them at the same score within milliseconds of each other. How is tie-breaking by earliest-achievement-time kept correct under concurrent writes?
- The weekly reset needs to happen atomically at midnight UTC without dropping any in-flight score updates. How do you do it?
- How do per-region leaderboards share infrastructure with the global one without 7x-ing your write cost?

## Rubric

- Uses an in-memory sorted-set style structure (e.g. Redis ZSET or equivalent) for O(log n) rank and range queries instead of sorting on every read.
- Names the key trade-off: strict real-time accuracy for every rank lookup versus caching/batching writes for throughput at the stated 3,000 updates/second scale.
- Describes rank lookup for an arbitrary player (not just top 100) using rank-within-sorted-structure rather than scanning all 8 million scores.
- Addresses tie-breaking deterministically, using a composite sort key (score plus timestamp) rather than relying on insertion order accidentally.
- Covers the weekly reset as an atomic cutover (e.g. swap to a new structure/key and archive the old one) rather than deleting and rebuilding live data.
- Discusses how per-region leaderboards are derived or partitioned from the same write stream without duplicating write load proportionally.
- Mentions caching the top-100 view separately from the full rank structure since it is read far more often than it changes.

## Pitfalls

- Recomputing the full sorted leaderboard on every write or every read instead of using an incrementally maintained sorted structure.
- Ignoring tie-breaking rules and letting ties resolve nondeterministically.
- Treating "my rank" as requiring a full table scan, with no discussion of its cost at 8 million players.
- No plan for the weekly reset boundary, risking lost updates or a visible outage during cutover.
