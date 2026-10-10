---
id: hotel-reservation
title: Design a hotel reservation system
level: mid
topics: [inventory-management, concurrency, search, overbooking]
minutes: 45
---

## Prompt

A booking site lets users search hotels by city and dates, see available
rooms, and reserve one. Design the system that manages room inventory and
bookings across many hotels.

## Clarifications

- **Scale?** 50,000 hotels, average 120 rooms each, 2 million searches/day, 150,000 confirmed bookings/day.
- **Search pattern?** User searches by city, check-in/check-out dates, and guest count; expects results in under 1 second.
- **Booking window?** Reservations are made anywhere from same-day to 12 months in advance.
- **Room types?** Each hotel offers 3-8 room types (e.g. standard, deluxe, suite), each with its own nightly inventory count.
- **Hold during checkout?** A room is tentatively held for 10 minutes while the user enters payment details.
- **Overbooking policy?** Business allows intentional overbooking of up to 3% per room type to cover historical no-show rates, but never for the last 2 rooms of a type.
- **Multi-night bookings?** A booking can span 1 to 21 nights and must hold inventory for every night in the range simultaneously.

## Follow-ups

- Two users try to book the last available deluxe room for the same 3 nights within 100ms of each other. Walk through what happens.
- A multi-night booking spans a date range where the room type has different availability on different nights (3 rooms left on night 1, 1 room left on night 2). How does your hold logic handle this?
- The overbooking policy means confirmed bookings can occasionally exceed physical rooms on a given night. How does your system decide who gets walked, and how is that kept out of the booking-availability logic itself?
- Scale to a flash sale where a major city hotel gets 10x normal search and booking traffic for a day. What changes?
- A hotel needs to take 10 rooms out of inventory for maintenance starting tomorrow, affecting already-confirmed future bookings. How does your system handle this without silently cancelling guests?

## Rubric

- Models inventory per hotel, per room type, per night, so multi-night bookings are checked and held across a date range, not just a single count.
- Names the key trade-off: overbooking increases revenue and offsets no-shows but adds operational complexity and risk, and must be bounded away from critically low inventory.
- Uses an atomic multi-night hold mechanism so a booking spanning several nights either reserves all required nights or none, avoiding partial holds.
- Addresses the search-to-booking funnel: search can tolerate some staleness (cached availability), but the final booking step must check fresh, authoritative inventory.
- Covers the 10-minute hold and its expiry/release mechanism explicitly, including what happens if a user's session dies mid-checkout.
- Discusses how search at 2 million/day is served efficiently, likely via a read-optimized index separate from the transactional booking store.
- Distinguishes the "walk a guest" operational decision from the core availability/booking consistency logic, keeping them as separate concerns.

## Pitfalls

- Modeling inventory as a single per-hotel count instead of per-room-type-per-night, breaking multi-night and mixed-availability bookings.
- Allowing search results to double as the authoritative source for final booking confirmation without a fresh re-check.
- Treating overbooking as a free policy lever without acknowledging the risk window it creates near full capacity.
- Ignoring what happens to confirmed bookings when a hotel pulls rooms from inventory after the fact.
