# Lesson 16 · One ticket, two places it must appear

**Reading time:** 11 min · **Concept:** dual write problem, transactional outbox, Kafka topics and partitions
**Mission:** 16

## The problem

An order is placed. Your service does two separate things: it saves the order in Postgres, and
it announces "a new order happened" so that other parts of the system, a warehouse feed, an
analytics job, a notification service, can react. Those are two different systems. What happens
if the save succeeds and the announcement is lost? What if the announcement goes out but the
save then fails and rolls back? Either way, something downstream now disagrees with the truth.

## Why it is hard

It feels like it should be simple: save the order, then send the message. But "save, then send"
is two separate actions with no way to make them succeed or fail together automatically. A crash,
a network blip, or a slow downstream system between the two steps leaves you in one of the two
broken states above, and neither looks like an obvious bug. This is the **dual write problem**:
writing the same fact to two different systems that cannot be updated together in one step.

## The idea: the kitchen ticket and the board

A small bakery takes orders at the counter and bakes them in the back. The counter writes an
order slip and also calls the baking order out loud so the kitchen knows to start. Imagine the
counter person writes the slip, then trips and drops the stack of call-outs for the next hour.
The slip exists, the order is "placed", but the kitchen never heard it and nothing gets baked.
Or the opposite: the call-out happens, the kitchen starts baking, and then the counter notices
the customer's card was declined and voids the slip. Now bread is baking for an order that no
longer officially exists.

### Writing it once, in one place, so it cannot half-happen

Here is the fix the bakery actually uses: the counter person writes **two things on the same
slip**, in one motion: the order itself, and a duplicate strip clipped to it, torn off and
pinned to a board the kitchen watches. Writing the order and pinning the strip happen as one
action, with one pen, on one piece of paper. There is no moment where the order exists but the
strip does not, or the other way round, because they are the same physical write.

A separate runner, not the busy counter person, walks past the board every few seconds, picks up
new strips, and carries them to the kitchen. If the runner trips, the strip is still on the
board; they just pick it up next pass.

### The same trick in your service: the outbox table

Translate this directly. Your order service, inside the **same database transaction** that
inserts the order row, also inserts a row into an `outbox` table: "order 9001 was created, here
is the event payload". Both inserts are part of one transaction, so Postgres guarantees they
either both commit or both roll back together, exactly like the slip and the strip being the
same piece of paper. There is no window where the order exists in the database without a matching
row describing the event, because a rolled-back transaction erases both, and a committed one
keeps both.

A separate, small process, the **outbox publisher**, reads unpublished rows from the outbox
table (that is the "runner") and sends them onward to the messaging system. If this process
crashes partway, the un-sent rows are still sitting in the table; it reads them again next time
it runs. This whole approach is called the **transactional outbox pattern**: write the fact you
need to publish into your own database, in the same transaction as the business change, and let
something else deliver it later.

### Where the "announcing" system in this lab is: Kafka

The messaging system the outbox publisher writes to in this lab is **Kafka**. Three words you
need before touching it:

- A **topic** is a named, ordered stream of messages, like "order-events". Anything interested
  in orders reads from that stream rather than being called directly.
- A topic is split into **partitions**: independent, ordered sub-streams. If "order-events" has
  6 partitions and your system pushes 60 events per second total, roughly 10 events per second
  land in each partition, assuming events spread evenly across them. Order is only guaranteed
  *within* one partition, not across all of them, so events about the same order must land in
  the same partition (normally by sending with the order's id as a key) if their order among
  each other matters.
- A **producer** is anything that writes messages into a topic. In this lab, the outbox publisher
  is the producer; it does not know or care yet who will eventually read the messages.

## Why not just publish directly and skip the table?

You could call Kafka directly from inside the order-saving code, no outbox table at all. It
would work almost all of the time. The problem is exactly the dual write problem from the start
of this lesson: the database commit and the Kafka send are still two separate operations that
can succeed or fail independently. The outbox does not make publishing instant, it makes the
*decision* to publish durable and attached to the same transaction as the fact itself, so nothing
is lost even if the publishing step itself has to happen a little later.

## Where you will meet this

- Any time one write needs to "tell" another system, a cache to invalidate, a search index to
  update, an email to send, a notification to fire.
- Event-driven architectures in general: most reliable event publishing in production uses this
  pattern or something equivalent to it, under a different name.
- Debugging "the order exists but nothing downstream reacted": check whether the outbox row was
  ever written, and whether the publisher is actually running.

## One sentence summary

> Writing a fact and announcing it are two different systems that cannot update together for
> free, so write the announcement into your own database first, in the same transaction, and let
> a separate step deliver it afterward.

## Check question

Your outbox publisher reads 10 unpublished rows, successfully sends 7 to Kafka, then crashes
before marking any of the 10 as sent. What happens to those 7 already-sent events the next time
the publisher starts up and reads unpublished rows again, and what would you need on the
receiving side to make that safe?
