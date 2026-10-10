---
id: flash-sale
title: Design the inventory system for a flash sale
level: mid
topics: [inventory, concurrency, overselling, queueing]
minutes: 45
---

## Prompt

An e-commerce site is running a flash sale: a limited quantity of one popular
item goes on sale at a fixed time. Design the system that handles inventory
so the site does not oversell.

## Clarifications

- **Inventory size?** 5,000 units of the item available at sale start.
- **Demand?** 300,000 users are waiting on the page when the sale starts,
  generating about 50k purchase attempts/second in the first 10 seconds.
- **Correctness requirement?** Never sell more than 5,000 units, a handful of
  undersold units is acceptable, overselling is not.
- **Checkout flow?** A successful inventory reservation holds the unit for 5
  minutes while the user completes payment, then releases it if payment
  fails or times out.
- **Fairness?** First-come-first-served is acceptable, no requirement for a
  lottery or queue-position guarantee.
- **Infrastructure?** Standard relational database plus a cache layer are
  both available, no existing specialized queueing system in place.

## Follow-ups

- Two requests for the last unit arrive at the same database node within a
  millisecond of each other, walk through exactly what prevents both from
  succeeding.
- The payment step itself is slow and takes up to 30 seconds under load, how
  does that interact with the 5-minute reservation hold?
- The sale item sells out in 8 seconds, how do you keep the other 292,000
  disappointed users from crashing the site with retry traffic?
- How would the design change if there were 50 different items on sale
  simultaneously, each with its own limited quantity?
- A payment provider webhook confirming payment arrives 10 minutes late,
  after the reservation already expired and the unit was resold, how do you
  handle that conflict?

## Rubric

- Uses an atomic decrement (conditional update, Lua script, or equivalent)
  on a single counter per item rather than read-then-write, to prevent the
  race condition of overselling.
- Names the core trade-off: a single hot counter is simple and correct but
  becomes a serialization point at 50k/second, versus sharding the counter
  for throughput at the cost of more complex exact-zero detection.
- Describes the reservation-with-timeout pattern (hold unit, expire if
  payment not completed) and how expiry safely returns stock.
- Explains how the system sheds load before it reaches the database, such as
  a queue or token-bucket admission step at the edge once stock is known to
  be nearly gone.
- Addresses idempotency for retried purchase requests from the same user.
- Covers what happens to the UI/traffic for the 99% of users who do not get
  the item, so the site itself stays up.
- Discusses the late-webhook reconciliation case explicitly rather than
  assuming payment confirmation always arrives inside the hold window.

## Pitfalls

- Read-then-write inventory check without atomicity, the classic oversell bug.
- No reservation/expiry mechanism, treating "reserved" and "sold" as the
  same state.
- Designing only for the happy path and ignoring the 290k+ losing requests
  that still hit the system.
- Assuming a single database server scales to 50k writes/second without
  discussing sharding or an admission queue.
