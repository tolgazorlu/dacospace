---
id: ride-matching
title: Design the driver-matching system for a ride-hailing app
level: senior
topics: [geospatial-indexing, dispatch, real-time-systems, queueing]
minutes: 45
---

## Prompt

A rider opens the app, taps "request ride", and expects a driver to be
assigned within a few seconds. Design the backend system that matches
riders to nearby available drivers.

## Clarifications

- **Scale?** 500k concurrent riders and 150k active drivers in peak hours across 80 cities.
- **Request rate?** 2,000 ride requests/second at peak globally.
- **Location updates?** Each driver's app pings location every 4 seconds, so about 37,500 location updates/second from active drivers alone.
- **Matching SLA?** A driver must be assigned within 5 seconds of the request, or the rider sees "searching" retry with an expanded radius.
- **Search radius?** Start at 1.5 km, expand to 3 km and then 6 km if no driver accepts within 2-second windows.
- **Driver response window?** A dispatched driver has 10 seconds to accept; on timeout or decline, move to the next candidate.
- **Data freshness tolerance?** A driver location older than 15 seconds is treated as stale and excluded from matching.

## Follow-ups

- Two riders in the same block request a ride within 200ms of each other and the nearest driver can only serve one. How do you avoid assigning the same driver to both?
- A city has a surge event (concert letting out) and demand is 10x normal for 20 minutes. What changes in your matching strategy?
- How do you handle a driver who accepts but then the GPS shows them not moving toward the pickup for 90 seconds?
- The geospatial index node for downtown holding 20k drivers goes down. What is the blast radius and recovery path?
- Product wants to add a "prefer drivers with rating > 4.8" filter. How does this change candidate selection latency?

## Rubric

- Uses a geospatial index (geohash grid or quadtree/S2 cells) to narrow candidates before scoring, not a full scan of all drivers.
- Names the core trade-off: expanding search radius trades match latency against driver idle-trip distance and rider wait time.
- Proposes an atomic assignment step (lock or compare-and-swap per driver) to prevent double-dispatch of one driver to two riders.
- Separates the high-frequency location-update path from the matching/dispatch path so writes do not block reads.
- Addresses driver accept/decline/timeout state machine with a bounded retry and fallback to next candidate.
- Discusses how stale or missing location pings are excluded without false negatives.
- Mentions how surge affects matching, either radius expansion, pricing-based demand shaping, or both, and picks one.

## Pitfalls

- Treating driver location as always fresh and never discussing staleness or missed pings.
- Designing matching as a single global queue without geospatial partitioning, ignoring scale.
- Missing the double-assignment race condition entirely.
- Jumping straight to machine-learning-based ranking without first establishing a correct, race-free assignment mechanism.
