---
id: notification-service
title: Design a notification service for push, email, and SMS
level: mid
topics: [queues, fan-out, delivery-guarantees]
minutes: 45
---

## Prompt

Other internal services need to notify end users through push notifications, email, or SMS. Design a notification service that those services call.

## Clarifications

- **Scale?** 50 million notifications sent per day across all channels, peak 3,000/sec during business hours, average 580/sec.
- **Channel mix?** Roughly 70% push, 20% email, 10% SMS.
- **Who are the senders?** About 30 internal microservices (order updates, marketing campaigns, security alerts) calling a shared API.
- **Delivery guarantee?** At-least-once delivery to the channel provider; duplicate notifications to the end user should be rare but are acceptable over silently dropping one.
- **Latency requirement?** Transactional notifications (e.g. OTP, security alerts) must be sent within 2 seconds of the request; marketing/bulk notifications can be delayed up to 10 minutes and are batched.
- **User preferences?** Users can opt out per channel and per notification category; the service must check preferences before sending.
- **External providers?** One push provider (e.g. FCM/APNs equivalent), one email provider, one SMS provider, each with their own rate limits around 1,000-5,000 requests/sec.

## Follow-ups

- The SMS provider starts returning errors for 30% of requests. How does the system degrade gracefully without losing those notifications or retrying forever?
- A marketing campaign wants to send to 10 million users within an hour. How does that interact with the transactional traffic's 2-second SLA?
- How do you prevent the same user from getting the same notification twice if a sending service retries its API call after a timeout?
- Add a requirement: users should be able to see a notification history/inbox in-app. What changes?

## Rubric

- Separates the system into an ingestion API, a queue/broker per channel or priority, and channel-specific worker pools that call external providers.
- Names the key trade-off: at-least-once delivery with idempotency keys (simpler infra, requires dedup on the client/receiver side) versus exactly-once (far more complex coordination, usually not worth it here).
- Distinguishes transactional (low latency, high priority queue) from bulk/marketing traffic (batched, lower priority queue) so one does not starve the other.
- Covers retry strategy with exponential backoff and a dead-letter queue for notifications that fail after N attempts, plus how failures are surfaced.
- Addresses user preference checks happening before enqueueing or before sending, not after, to avoid wasted provider calls and compliance risk.
- Mentions provider rate limits and that workers must throttle to stay under 1,000-5,000 req/sec per provider, possibly with per-provider queues.
- Discusses idempotency keys (e.g. request id from the calling service) to dedupe retries.

## Pitfalls

- Treating all three channels as one undifferentiated queue with no priority, which lets a bulk marketing blast delay a security alert.
- No idempotency mechanism, so a caller's retry after a network timeout results in duplicate sends.
- Ignoring that external providers have their own rate limits and assuming the notification service can push unlimited throughput to them.
- Checking user opt-out preferences only as an afterthought or not at all.
