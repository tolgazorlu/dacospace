# Lesson 12 · Cache expired, everyone rushed the DB

**Reading time:** 12 min · **Concept:** cache stampede (thundering herd), request coalescing (single flight), jittered TTL, early refresh
**Mission:** 12

## The problem

The cache from lesson 11 is working well. Campaign day arrives: 09:00:00, every dealer opens the
app at once to see if there is a deal on the 20 campaign products. The cached entry for that
category happens to have been written at 08:59:00 with a 60-second TTL, so it expires at exactly
09:00:00, the same instant 500 dealers' requests land. Every one of those 500 requests checks
Redis, finds nothing, and does exactly what cache-aside tells it to do: go ask Postgres. Your pool
of 10 connections, which comfortably handled the steady trickle of everyday traffic, now has 500
requests trying to borrow a connection at once.

## Why it is hard

The cache did its job for 59 seconds and 59.9 seconds; the problem shows up precisely at the
moment it stops doing its job, and it shows up as a spike, not a gradual slope, because every one
of those 500 requests was asking the identical question and got told "not cached" at the identical
moment. Little's Law from lesson 02 has not changed: your pool can still only hold 10 requests at
once. 500 arrivals against a pool of 10 is the queue that grows every second, and it grows because
of one expired cache entry, not because traffic actually increased.

## The idea: the herd rushes the one open gate

Picture a herd of animals that all drink from one pond. Most of the day they are spread out.
Then, at the one moment the pond is refilled, every one of them rushes it at once, and they
trample each other at the gate, even though the pond itself would have been plenty for all of
them one at a time. That rush is called a **thundering herd**, or in a cache specifically a
**cache stampede**: many requests discover the same missing cache entry at the same moment and
all go straight to the source behind it.

### Request coalescing: only the first one actually goes

The 500 dealers do not need 500 separate trips to Postgres. They need the database queried
**once**, with the other 499 simply waiting for that one answer and then sharing it. That is
**request coalescing**, often called **single flight**: for a given cache key, only the first
request that finds it missing is allowed to go fetch it. Every other request that arrives for the
same key while the fetch is in flight does not start its own database query; it waits on the
result the first request is already producing, and gets handed the same answer the moment it is
ready.

```
500 requests miss "products:category:flour" within the same 200 ms window.
Without coalescing: 500 queries sent to Postgres, 490 of them queue behind a pool of 10.
With coalescing:    1 query sent to Postgres, 499 requests wait on that 1 result, then all return.
```

One query instead of five hundred is not a small optimization, it is the difference between a
pool that is briefly busy and a pool that is saturated for however long it takes to work through a
490-deep queue. In practice this is implemented with a lock or a shared, in-progress future keyed
by the cache key: whoever gets there first creates it, everyone else attaches to it instead of
duplicating the work.

### Jittered TTL: do not let every clock strike midnight together

Request coalescing fixes the stampede once it starts. **Jittered TTL** tries to stop many keys
from expiring at the exact same instant in the first place. If every category's cache entry is
written with a flat 60-second TTL, and several of them happened to be written in the same second
(say, right after a deploy warmed the cache), they will all expire in that same second too,
producing several stampedes at once instead of one. Add a small random amount to each TTL instead
of a fixed number: say, a base of 60 seconds plus a random extra of 0 to 10 seconds, giving each
entry an actual TTL somewhere between 60 and 70 seconds. Spread across many keys, expirations now
land across a 10-second window instead of a single instant, so the database sees a trickle of
refreshes rather than one spike.

### Early refresh: refill the pond before it runs dry

Jitter spreads things out but a single hot key, like the 20-campaign-products category on
campaign day, can still matter enough on its own that you do not want to wait for it to go fully
empty before refreshing it. **Early refresh** changes the rule from "refresh only after expiry" to
"refresh a little before expiry, while the old value is still being served". For example: if an
entry's TTL is 60 seconds, you might trigger a background refresh once its remaining life drops
below 5 seconds, while every request in that window keeps getting the still-valid cached value
immediately. One request's cache read becomes the trigger for a refresh that happens quietly in
the background; nobody has to wait for it, and because the key never actually reaches zero under
heavy traffic, there is no moment where hundreds of requests discover a miss at once.

Jitter and early refresh solve different parts of the same problem: jitter keeps many *different*
keys from aligning, early refresh keeps *one hot* key from ever fully running out. Request
coalescing is the safety net underneath both, for whatever moment of simultaneous miss still slips
through.

## Where you will meet this

- Cache warm-up after a deploy: every key you pre-populated at the same timestamp will later
  expire at the same timestamp unless you add jitter.
- Any single hot key, a homepage, a campaign price list, a trending feed, is the one most exposed
  to a stampede, precisely because it is the most popular.
- Code review on a caching layer: "what happens when this key expires under load" is worth asking
  before "what happens when it's a cache hit".

## One sentence summary

> A cache stampede is many requests discovering the same expired key at the same instant and all
> going to the database at once; coalescing lets only one of them actually go, jitter keeps
> different keys from expiring together, and early refresh keeps one hot key from reaching zero
> under load in the first place.

## Check question

A cache entry for a different category, "sugar", was written at 10:14:30 with a flat 60-second
TTL and no jitter and no early refresh. 300 requests for "sugar" arrive between 10:15:29 and
10:15:31. Roughly how many of them will find the entry missing and go straight to the database,
and which single change from this lesson would turn that into roughly one database query instead?
