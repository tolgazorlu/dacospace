---
id: ad-click-aggregator
title: Design an ad click aggregation and reporting system
level: senior
topics: [stream-processing, aggregation, exactly-once, time-windows]
minutes: 45
---

## Prompt

An ad network needs to count clicks per ad campaign in near real time, so
advertisers can see spend and performance in a dashboard. Design the system
that ingests click events and produces those aggregates.

## Clarifications

- **Scale?** 300k ad impressions/second platform-wide, click-through rate
  around 1%, so about 3k clicks/second average, 10k/second at peak.
- **Campaigns?** 500k active campaigns at any time.
- **Dashboard freshness?** Advertisers expect counts updated within 1 minute
  of a click happening.
- **Query pattern?** Dashboard reads are per-campaign, per-hour and
  per-day rollups, about 50k dashboard reads/minute at peak.
- **Correctness requirement?** Billing is based on these counts, so
  duplicate counting or dropped clicks directly cost or cheat advertisers,
  tolerance is under 0.1% error.
- **Retention?** Raw click events kept 30 days for fraud investigation,
  aggregates kept for 2 years.
- **Click fraud?** Out of scope for this design beyond noting where a fraud
  filter would plug in.

## Follow-ups

- A click arrives 20 minutes late due to a mobile client retry queue, does it
  still get counted, and in which time window?
- The same click gets delivered twice because the client retried an
  unacknowledged request, how do you avoid double counting?
- Peak traffic spikes to 10x (100k clicks/second) during a major sale event,
  what part of the pipeline degrades first?
- An advertiser disputes their count and wants to audit exactly which clicks
  were counted, how do you support that without storing everything forever
  in the hot path?
- How do you backfill a corrected aggregate if a bug undercounted for 3 hours
  yesterday, without double-counting on replay?

## Rubric

- Chooses a stream processing approach (e.g. windowed aggregation over a log
  like Kafka) over naive per-click database increments at this throughput.
- Names the core trade-off explicitly: exactly-once correctness (idempotent
  dedup keys, watermarks for late data) versus lower latency and simpler
  at-least-once delivery that risks overcounting.
- Defines a concrete deduplication key (e.g. impression id plus click id) and
  a dedup window matching the late-arrival tolerance.
- Separates the hot aggregation path (counters per campaign per minute) from
  the cold raw-event store used for audits and replay.
- Explains watermarking or allowed lateness for out-of-order events and what
  happens to events arriving after the window closes.
- Describes how reprocessing/backfill is made idempotent so replaying a time
  range does not double the aggregate.
- Addresses read scaling for the dashboard via precomputed rollups rather
  than scanning raw events per query.

## Pitfalls

- Incrementing a single database counter per click with no dedup, ignoring
  at-least-once delivery semantics.
- No answer for late or out-of-order events.
- Conflating the audit/raw-storage requirement with the real-time aggregate
  path, leading to one system trying to do both badly.
- Not noticing that billing accuracy changes the acceptable trade-offs
  compared to a casual analytics dashboard.
