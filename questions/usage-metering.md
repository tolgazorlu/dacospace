---
id: usage-metering
title: Design usage metering and billing for a multi-tenant SaaS platform
level: senior
topics: [metering, billing, multi-tenancy, event-aggregation, idempotency]
minutes: 45
---

## Prompt

A SaaS platform charges customers based on usage, like API calls or GB
processed, in addition to a base subscription fee. Design the system that
tracks usage per customer and produces accurate monthly bills.

## Clarifications

- **Scale?** 50,000 tenant accounts, generating 2 billion billable usage
  events/day across the platform (roughly 23k events/second average, 80k/s
  at peak).
- **Billing granularity?** Usage is billed per unit (e.g. per API call or
  per GB), aggregated monthly, with a free tier of 100,000 units/month per
  tenant before charges apply.
- **Accuracy requirement?** Billing must match actual usage within 0.01%,
  since customers are charged real money and audit it; undercounting and
  overcounting are both unacceptable.
- **Visibility?** Each tenant can see their running usage total in a
  dashboard, updated within 5 minutes of usage happening.
- **Billing cycle?** Monthly invoices generated on each tenant's billing
  anniversary date, invoices finalized and immutable once generated.
- **Late or duplicate events?** Usage events can arrive up to 15 minutes
  late due to upstream service retries, and the same event can be delivered
  more than once.
- **Disputes?** A tenant can dispute a charge, support needs to trace an
  invoice line item back to the underlying usage events.

## Follow-ups

- An upstream service redelivers a batch of events that were already
  counted, due to a consumer restart, how does the final invoice avoid
  double-billing for that?
- One tenant suddenly generates 100x their normal usage overnight (a bug in
  their integration), does that break metering for other tenants, and should
  it affect their bill?
- A tenant's invoice is generated on the 1st, but a usage event from the
  previous billing period arrives on the 3rd due to the 15-minute-late
  allowance edge case compounding with a processing delay, what happens?
- How do you reprocess the last 6 hours of usage if a bug in the aggregation
  logic undercounted everyone, without creating duplicate charges for events
  already billed?
- How would the design change to support real-time usage-based throttling
  (cutting off a tenant who hits a hard spend cap), not just monthly billing?

## Rubric

- Separates the high-throughput usage event ingestion path from the
  lower-frequency billing aggregation and invoice generation path.
- Names the core trade-off: strict exactly-once accounting (idempotency keys,
  dedup windows, reconciliation jobs) adds latency and storage cost versus a
  simpler at-least-once pipeline that risks the 0.01% accuracy bar given
  known duplicate and late delivery behavior.
- Defines a concrete idempotency key per usage event so retried or
  redelivered events are deduped before they affect any aggregate.
- Describes a cutoff and reconciliation window for monthly aggregation that
  accounts for the 15-minute late-arrival allowance before an invoice is
  finalized.
- Explains how per-tenant usage counters are isolated so one tenant's volume
  spike cannot slow down or corrupt another tenant's metering.
- Covers traceability: every invoice line item can be traced back to the
  underlying raw usage events for dispute resolution, implying raw events
  are retained, not just rolled up.
- Addresses safe reprocessing/backfill of aggregates without double-counting
  already-billed events, likely via idempotent upserts keyed by period.

## Pitfalls

- Incrementing a single running total per tenant with no dedup, vulnerable
  to double-counting on redelivery.
- Finalizing invoices without any buffer for known late-arriving events.
- Storing only aggregated counts with no raw event trail, making disputes
  unresolvable.
- No tenant isolation, so one tenant's usage spike degrades the metering
  pipeline for everyone.
