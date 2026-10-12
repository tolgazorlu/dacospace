# Lesson 06 · The last 10 items

**Reading time:** 11 min · **Concept:** race condition, lost update, read-check-write, atomic conditional UPDATE, optimistic locking, SELECT FOR UPDATE
**Mission:** 06

## The problem

A campaign product has 10 units left. Two dealers, in two different cities, both place an order
for 1 unit within the same second. Both orders succeed. Stock now reads 9, not 8. Somewhere a unit
of stock exists twice: once in the warehouse that has none left, and once in two dealers' orders
who both think they are getting one. Nobody wrote buggy arithmetic. The subtraction "10 minus 1
minus 1 equals 8" is correct. The code just never got the chance to do it that way.

## Why it is hard

You read code top to bottom and imagine it running top to bottom, alone. In production, two
requests for the same product can run their Java code at genuinely the same time, on different
threads, maybe on different servers. Each one individually looks correct in isolation. The bug
only exists in the gap between two requests, which is exactly the part that is hardest to see by
reading either one of them on its own. This is a **race condition**: the result depends on the
timing of two things that were supposed to happen one after another, but didn't.

## The idea: two dealers, one shelf, no lock

Picture a shelf with 10 boxes of a product. Two clerks, each serving a different dealer, both walk
up to the shelf at the same moment.

1. Clerk A looks at the shelf: 10 boxes. "Enough for 1, I'll take it."
2. Clerk B looks at the shelf: also 10 boxes, because clerk A has not updated the count yet.
   "Enough for 1, I'll take it."
3. Clerk A takes a box, writes "9" on the shelf label.
4. Clerk B takes a box, writes "9" on the shelf label too, because that is what B calculated from
   the 10 B saw.

Two boxes left the shelf. The label says 9, should say 8. Clerk B's correct-looking update
overwrote the effect of clerk A's correct-looking update. This is a **lost update**: two writes
based on the same stale read, and the second write throws away the first one's effect.

The code pattern behind it is called **read-check-write**: read the current value, check it in
Java ("is stock >= 1?"), then write a new value back. The gap between the read and the write is
exactly where another request can sneak in and read the same stale value. The gap can be a single
millisecond and the bug still happens, because under load, a millisecond is plenty of time for
another request to run.

```java
int stock = repository.findStock(productId);   // read
if (stock >= quantity) {                        // check, in Java
    repository.updateStock(productId, stock - quantity); // write
}
```

Nothing here is wrong Java. It is wrong **concurrent** Java.

### Fix 1: make the database do the check, atomically

Instead of reading, deciding in Java, then writing, ask the database to check and update in one
indivisible statement:

```sql
UPDATE products
SET stock = stock - 1
WHERE id = 42 AND stock >= 1;
```

Either a row matches and is updated, or it does not and zero rows are updated. There is no gap
between "check" and "write" for another request to land in, because Postgres runs this as a single
operation. Your Java code then looks at how many rows were affected: 1 means you got the unit,
0 means someone else already took the last one and you must tell the dealer that. This is the
cheapest, most common fix for exactly this shape of bug.

### Fix 2: optimistic locking with a version column

Sometimes the check is more than one column, or you need to update several fields together.
**Optimistic locking** adds a `version` column to the row. Every update does
`WHERE id = 42 AND version = 7` and also increments the version. If another request already
updated the row, the version no longer matches, zero rows update, and your code (with
`@Version` in JPA) gets a clear "someone else changed this first, retry or give up" signal instead
of silently overwriting. It is called optimistic because it assumes collisions are rare and only
pays the cost of detecting one when it actually happens.

### Fix 3: lock the row and make the other request wait

`SELECT ... FOR UPDATE` reads a row and tells Postgres "hold a lock on this row until my
transaction ends; anyone else who tries to touch it must wait". Clerk B, in this version, is
physically not allowed to look at the shelf label until clerk A is done. This removes the race by
forcing the two requests to happen one after another instead of overlapping. It is the most
certain fix and also the one most likely to turn into a queue of waiting requests if many dealers
order the same hot product at once, so it is best kept for short, fast transactions.

## Where you will meet this

- Any "check a limit, then act" code: stock, seat counts, a daily spend cap, a one-per-user coupon.
- Code review: a read of a value followed later, in the same request, by a write derived from it,
  with no database-level constraint tying them together, is worth asking "what if two of these run
  at once?"
- Load tests that fire many identical requests at once: the exact tool for surfacing this bug,
  because a single request can never show you a race.

## One sentence summary

> Read-check-write has a gap where two requests can both read the same stale value and both write
> based on it, so the fix is to make the database check and write as one atomic step, or to lock
> or version the row so the second writer notices the first one.

## Check question

A seat-booking service has 3 seats left for an event. Four requests arrive within the same
millisecond, each trying to book 1 seat, using read-check-write with no locking. In the worst case,
how many bookings could succeed, and what would the final seat count incorrectly show? Which of
the three fixes would you reach for first, and why?
