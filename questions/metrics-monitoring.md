---
id: metrics-monitoring
title: Design a metrics collection and monitoring system
level: senior
topics: [time-series-data, aggregation, alerting, cardinality]
minutes: 45
---

## Prompt

Thousands of services emit numeric metrics like request latency and error
counts, and engineers need dashboards and alerts built on them. Design the
system that collects, stores, and serves this data.

## Clarifications

- **Scale?** 20,000 hosts, each emitting 500 distinct metric time series, reporting every 10 seconds.
- **Ingest rate?** 20,000 x 500 / 10 seconds = 1 million data points/second at peak.
- **Query pattern?** Dashboards query recent data (last 1-24 hours) far more often than historical; roughly 95% of reads cover the last 24 hours.
- **Retention?** Raw resolution kept for 7 days, downsampled to 1-minute resolution for 13 months after that.
- **Alerting latency?** An alert rule breach must fire a notification within 60 seconds of the underlying data point arriving.
- **Cardinality?** Each metric can be tagged with host, service, region, and version, yielding up to 2 million unique time series in the system at once.
- **Query latency target?** Dashboard queries over a 1-hour window must return in under 500ms at p95.

## Follow-ups

- A misconfigured service starts emitting a new tag value per request (e.g. embedding a request ID as a tag), causing cardinality to explode. What breaks and how do you defend against it?
- An alert needs to fire within 60 seconds, but your ingest pipeline batches writes every 15 seconds for efficiency. Does this still work, and where are the risk points?
- Scale ingest to 10 million data points/second. What component of your pipeline needs to change first?
- A dashboard query spans a 6-month window mixing raw and downsampled data. How do you serve this consistently?
- The metrics store itself needs to be monitored. How do you avoid a circular dependency where the monitoring system's own failure is invisible?

## Rubric

- Chooses a time-series-oriented storage model (columnar or LSM-based, partitioned by time) rather than a general-purpose row store, and explains why.
- Names the key trade-off: cardinality (unique tag combinations) versus query flexibility, since high cardinality directly drives storage and query cost.
- Separates the hot ingest path (high write throughput, short retention, fast recent-data queries) from the cold/downsampled path (long retention, lower resolution).
- Describes the alerting pipeline as operating on the stream as it arrives (or a very short buffering window) rather than only on top of the queryable store, to meet the 60-second SLA.
- Proposes a concrete cardinality-control mechanism: tag allowlisting, per-metric cardinality limits, or rejecting unbounded tag values.
- Addresses downsampling/rollup jobs that convert raw data to lower resolution over time and how queries pick the right resolution for a given window.
- Covers self-monitoring or an independent health-check path so the monitoring system's own outages are observable.

## Pitfalls

- Storing every raw data point indefinitely without a retention/downsampling strategy, understating storage cost.
- No cardinality control, letting a single misbehaving service degrade the whole system for everyone.
- Building alerting as a periodic query against the main store instead of a stream-oriented check, missing the 60-second SLA under load.
- Treating all queries as equally latency-sensitive instead of optimizing for the stated 95% recent-data read pattern.
