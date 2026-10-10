---
id: ticket-booking
title: Design a concert ticket booking system with seat holds
level: mid
topics: [concurrency, inventory, distributed-locking, queueing]
minutes: 45
---

## Prompt

On-sale day for a popular concert, thousands of fans try to buy tickets for
the same 10,000-seat venue in the first minute. Design the system that lets
users pick seats, hold them, and complete checkout without double-selling.

## Clarifications

- **Scale?** 10,000 seats, 80,000 users hit the booking page in the first 60 seconds.
- **Peak request rate?** About 5,000 seat-selection attempts/second during the first minute, dropping to under 100/second after 5 minutes.
- **Hold duration?** A selected seat is held for 8 minutes while the user enters payment details.
- **Checkout time?** Average checkout (payment entry to confirmation) takes 90 seconds; 8-minute hold covers slow typers with margin.
- **Payment failure rate?** About 6% of checkouts fail payment and the seat must be released immediately.
- **Multiple seats per order?** Up to 8 seats per order, and all seats in an order must be held together or the order fails.
- **Waiting room?** Yes, users beyond the first 10,000 concurrent are placed in a queue and admitted as capacity frees up.

## Follow-ups

- Two users click the same seat within 50ms of each other. Walk through exactly what happens in your system.
- A user holds 8 seats, abandons the tab, and never checks out. How and when does the seat become available again, and what if your release job itself fails?
- Scale the scenario to a 70,000-seat stadium with 500,000 users in the first minute. What breaks first and what do you change?
- How do you prevent bots from holding large blocks of seats to scalp them?
- The payment provider has 3 seconds of added latency during the spike. How does that affect hold expiry correctness?

## Rubric

- Uses a per-seat atomic state transition (e.g. compare-and-swap in a database row or distributed lock) to make exactly one of two simultaneous claims win.
- Names the key trade-off: short holds reduce inventory lockup from abandoners but increase failed checkouts for slow users, longer holds do the reverse.
- Describes an explicit hold-expiry mechanism (TTL in cache, or a scheduled sweep) and what happens if that mechanism itself is delayed or fails.
- Treats multi-seat orders as a single transaction: all-or-nothing hold across seats, not independent per-seat holds that can partially fail.
- Covers the waiting-room/queue admission control to bound concurrent load on the booking path.
- Addresses bot and scalper mitigation (rate limits, CAPTCHAs, per-account seat caps) at least briefly.
- Distinguishes between the hold state and the final purchase state, with payment confirmation as the only path to a permanent sale.

## Pitfalls

- Using a simple "check then write" without atomicity, leaving a race window for double booking.
- Forgetting to release seats on payment failure or hold expiry, silently losing inventory.
- Not handling multi-seat orders as a unit, causing partial holds split across users.
- Ignoring the admission/waiting-room problem and assuming all 80,000 users can hit the seat map simultaneously.
