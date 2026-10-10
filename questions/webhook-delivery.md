---
id: webhook-delivery
title: Design a webhook delivery platform
level: mid
topics: [webhooks, retries, queueing, idempotency]
minutes: 45
---

## Prompt

We let customers register a URL to receive event notifications from our
platform, like "order.created" or "payment.failed." Design the system that
delivers these webhook events reliably.

## Clarifications

- **Scale?** 100k registered customer endpoints, generating 2,000
  events/second platform-wide at peak.
- **Delivery guarantee?** At-least-once delivery, customers are expected to
  handle duplicates using an event id.
- **Retry policy?** Failed deliveries (non-2xx response or timeout) retry
  with exponential backoff, up to 10 attempts over 24 hours, then the event
  is marked dead-lettered.
- **Latency expectation?** First delivery attempt within 5 seconds of the
  event occurring for healthy endpoints.
- **Customer endpoint health?** About 2% of registered endpoints are slow or
  down at any given time (misconfigured, deprecated, or temporarily failing).
- **Ordering?** Events for the same resource (e.g. the same order) should
  usually arrive in order, but strict global ordering is not required.
- **Visibility?** Customers can view delivery logs and manually replay a
  failed event for 14 days after it occurred.

## Follow-ups

- One customer's endpoint starts timing out on every request, what stops
  their retry traffic from consuming resources needed for everyone else's
  deliveries?
- A customer asks why they received the same "order.created" event three
  times, what's your answer and what should they be doing on their end?
- Event volume spikes 10x for 10 minutes during a flash sale, what backs up
  first and how do you keep delivery latency from degrading for unrelated
  customers?
- How do you support a customer replaying a specific event from 10 days ago
  without replaying every event since?
- A customer rotates their endpoint URL and the old one starts returning
  404s, how quickly does the system notice and what does it do?

## Rubric

- Uses a durable queue per destination (or sharded by destination) between
  event producers and the delivery workers, rather than delivering
  synchronously from the event source.
- Names the core trade-off: isolating slow/failing endpoints (e.g. separate
  queues or circuit breakers per destination) costs more infrastructure and
  complexity than a shared worker pool, but a shared pool lets one bad
  endpoint starve delivery for everyone else.
- Describes the exponential backoff and dead-letter policy concretely,
  matching the 10-attempts-over-24-hours requirement.
- Explains how each event gets a stable id so customers can dedupe, and
  states plainly that delivery is at-least-once, not exactly-once.
- Addresses per-destination ordering (e.g. a single in-order queue per
  customer endpoint) versus global ordering, and why global ordering is not
  attempted.
- Covers delivery logging and the manual replay feature as reads/writes
  against a retained event store, bounded by the 14-day window.
- Discusses backpressure handling during a traffic spike so one surge does
  not delay unrelated customers' events.

## Pitfalls

- Delivering webhooks synchronously inline with the event that triggered
  them, coupling producer latency to a customer's endpoint health.
- No isolation between endpoints, so one slow customer degrades delivery for
  everyone.
- Promising exactly-once delivery, which is not realistic over HTTP without
  heavy coordination.
- No concrete backoff/dead-letter policy, just "retry until it works."
