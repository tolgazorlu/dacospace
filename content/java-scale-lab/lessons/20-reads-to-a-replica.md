# Lesson 20 · Reads go to a replica

**Reading time:** 11 min · **Concept:** primary/replica, replication lag, read-your-writes, routing reads
**Mission:** 20

## The problem

Your single Postgres instance is busy: `GET /api/products` and `GET /api/dealers/{id}/orders`
are read-only and run constantly, but they are competing for the same connections and the same
CPU as the writes that actually change data, `POST /api/orders`. You add a second Postgres
instance that is a live copy of the first and send most of the reads there instead. Price lists
get faster. Then a dealer places an order, immediately opens "my orders" to check it went
through, and does not see it. Support gets a ticket: "the app lost my order". The order is sitting
in the database, perfectly safe. It just has not arrived at the copy yet.

## Why it is hard

Splitting reads from writes sounds like free capacity: twice the database, twice the throughput.
It is, for the part that reads data that is a little old. It is not free the moment a user reads
their own very recent write and expects to see it immediately. The system now has two different
versions of "the orders table" that agree eventually but not instantly, and you have to decide,
request by request, which version each read is allowed to see.

## The idea: the owner's ledger and the counter's photocopy

Picture a small bakery with one order ledger that only the owner writes in: every sale gets
written there first, in order. Customers at the counter do not wait for the owner; instead, the
counter clerk keeps a **photocopy** of the ledger, which the owner re-copies every few seconds
whenever there is a free moment. Most questions, "what did dealer 12 buy last week", can be
answered from the photocopy just fine, and now the owner is free to focus on taking new orders.

In database terms, the owner's ledger is the **primary**: the one copy that accepts writes. The
counter's photocopy is a **replica**: a copy that is kept up to date automatically but only
accepts reads. The gap between "the owner wrote it" and "the photocopy shows it" is called
**replication lag**, usually a fraction of a second but never exactly zero.

### When the gap bites

Say the replica is usually about 300 ms behind the primary. A dealer places an order at 10:00:00.000.
The write lands on the primary instantly. The photocopy catches up around 10:00:00.300. If the
dealer's app calls `GET /api/dealers/{id}/orders` at 10:00:00.100, routed to the replica, the new
order simply is not there yet: the clerk has not re-copied that page. Forty seconds later the
same call works fine. The data was never lost. The read just arrived too early.

This specific expectation, "I should immediately see the thing I just wrote", is called
**read-your-writes**. It is not a guarantee a plain replica gives you. You have to add it on
purpose.

### Three ways to keep read-your-writes

1. **Route that one read to the primary.** Right after a write, read the thing you just wrote
   from the primary, not the replica. In the lab, this means: after `POST /api/orders` succeeds,
   the confirmation screen for *that* order reads from the primary, while the general order
   history list (which the dealer did not just change) can still read from the replica.
2. **Wait for the replica to catch up**, then read. Workable, but now the dealer's screen is
   waiting on your database's internal housekeeping, which defeats some of the point of having a
   replica.
3. **Return the data you already have.** The response to `POST /api/orders` already contains the
   order you just created. If the next screen can be built from that response instead of a fresh
   read, there is no lag to worry about at all. Often the cheapest fix is simply not asking the
   database again for something you were just told.

None of these make replication lag zero. They make the specific reads that would embarrass you
go to the one place that is never behind: the primary.

### Deciding what goes where

Not every read needs to dodge the lag. The **price list** (`GET /api/products`) changes rarely
and is read by everyone; a dealer seeing a price that is half a second stale almost never matters,
so it is a perfect fit for the replica, and it is also the endpoint under the most load, so moving
it off the primary buys the most relief. The **order history right after placing an order** is
the opposite: rare, and exactly the moment staleness is visible to the one person who will
notice. The rule you are applying is: route by how much a stale answer would cost here, not by
which endpoint it happens to be.

## What can make the gap bigger than you expect

Replication lag is not a fixed number. It grows when the primary is doing a lot of writes at
once (a campaign day with many orders arriving per second), when the network between primary and
replica is slow or congested, or when the replica itself is busy answering a heavy read and falls
behind re-copying. A dashboard panel for replication lag is not optional once you route any
traffic to a replica: a replica that has silently fallen 30 seconds behind is serving answers
that are 30 seconds wrong, and nothing in a normal response tells the caller that.

## Where you will meet this

- Any read-after-write screen: "add to cart, then view cart", "post a comment, then see it in the
  thread", "place an order, then see it in my history".
- Scaling reads before scaling writes: most systems have far more reads than writes, so a replica
  is usually the cheapest next step after indexes and caching, not sharding the primary.
- Incident reviews where "the data was fine, the replica was just behind" is the actual root
  cause, not data loss.

## One sentence summary

> A replica gives you more read capacity for the price of a small, never-quite-zero delay, so the
> job is deciding which reads can tolerate that delay and routing the few that cannot back to the
> primary.

## Check question

Your replica's lag is usually 150 ms but climbs to 2 seconds during a campaign's order burst. A
dealer places an order during the burst and the confirmation page reads the order list from the
replica 500 ms later. Will they see their order? What is the smallest change you could make to
guarantee they do, without turning off the replica?
