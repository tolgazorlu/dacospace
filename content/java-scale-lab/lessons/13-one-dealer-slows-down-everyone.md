# Lesson 13 · One dealer slows down everyone

**Reading time:** 11 min · **Concept:** rate limiting, token bucket, per-tenant limits, 429 + Retry-After, noisy neighbor
**Mission:** 13

## The problem

Dealer 1 writes a small script to watch prices on the 20 campaign products, so they can order the
moment a deal appears. The script calls `GET /api/products?category=campaign` every 100
milliseconds, all day, forever. One dealer, out of 2,000, is now sending roughly 600 requests a
minute on their own, every one of them a real request your service has to answer, while the other
1,999 dealers are placing a few orders an hour between them. Those 1,999 dealers start noticing
the price list loads a little slower than it used to, for no reason they caused.

## Why it is hard

Nothing about dealer 1's script is malicious or even technically wrong; each individual request
is a perfectly normal `GET`. The problem is only visible in aggregate, and it is invisible to
dealer 1 entirely: their script gets fast answers and has no idea it is the reason dealer 1,847 is
waiting. Everyone shares the same pool of threads, the same database connections, the same
capacity you measured in lesson 02. One tenant using far more than their share, even without
breaking any rule, is called a **noisy neighbor**, borrowed from apartment buildings: the person
next door isn't doing anything illegal, they're just loud enough that everyone else's night is
worse for it.

## The idea: a bucket that refills

You cannot ask dealer 1 nicely to write a better script; you have to enforce a limit on the
server. The classic way to do that, and the one you will implement, is the **token bucket**.

Picture an actual bucket that holds tokens, up to some maximum, say 10. The bucket starts full.
Every request that arrives must take one token out of the bucket to proceed; if the bucket is
empty, the request is rejected. Separately, tokens drip back into the bucket at a steady rate, say
2 tokens every second, up to the 10-token maximum. That is **rate limiting**: capping how much
work you accept from a source over time, using the bucket as the thing that remembers "how much is
left".

### Walking a dealer's bucket through a burst

Say dealer 1's bucket has a capacity of 10 tokens and refills at 2 tokens per second. Their script
fires 15 requests essentially all at once, at time zero:

```
t = 0.0s   bucket has 10 tokens   requests 1-10 each take 1 token   bucket now has 0
t = 0.0s   requests 11-15 arrive, bucket has 0 tokens               all 5 rejected
```

The first 10 requests succeed instantly, because the bucket started full, a short **burst** is
allowed. The next 5 fail, because there is nothing left to take. Half a second later, the bucket
has refilled by 1 token (2 tokens per second times 0.5 seconds); after a full second, it has
refilled by 2. So at t = 2.5 seconds, the bucket holds 5 tokens again (2 tokens/second times 2.5
seconds), and dealer 1's script could successfully make 5 more requests before running dry again.
Across any long stretch of time, the bucket settles at letting through at most 2 requests per
second on average, no matter how it is shaped moment to moment, because that is the only rate the
bucket can sustain refilling at.

This is exactly Little's Law wearing a different hat: the bucket's steady-state throughput is
capped by its refill rate, the same way a connection pool's throughput was capped by
`size / W` in lesson 02. A bucket just allows a short burst up front, using its capacity, before
settling into the refill rate.

### Per-tenant limits: one bucket each, not one bucket for everyone

If you gave the *whole service* a single shared bucket, dealer 1's script would still drain it and
starve the other 1,999 dealers just the same, only now you would be rate-limiting everyone
together instead of one noisy neighbor alone. The fix is to give each **tenant**, here meaning
each dealer, their own bucket, keyed by dealer id. Dealer 1's script can only ever drain dealer
1's bucket. Dealer 2 through 2,000 each have a full, untouched bucket of their own, because
nothing dealer 1 does can take a token out of a bucket that belongs to someone else. The noisy
neighbor is now contained to their own apartment.

### Telling the client what happened: 429 and Retry-After

A rejected request should not just silently vanish or come back as a confusing 500. The HTTP
status code for "you have sent too many requests" is **429 Too Many Requests**, and the honest,
useful thing to send along with it is a **`Retry-After`** header telling the client how many
seconds to wait before trying again. For dealer 1's bucket refilling at 2 tokens per second, if
their script's 11th request arrives with the bucket empty, a `Retry-After: 1` is a fair, specific
answer: in about half a second there will be one token back, wait roughly that long rather than
hammering the endpoint every 100 milliseconds and getting 429 every single time. A well-behaved
client backs off on seeing 429 the same way it would on a timeout from lesson 08; a script that
ignores the header and keeps firing every 100ms is now cleanly rejected instead of consuming real
capacity.

## Where you will meet this

- Any public or multi-tenant API: without a per-tenant limit, one integration's bug or overly
  eager polling becomes every other customer's slowdown.
- Login endpoints and anything guarding against abuse, where the bucket also doubles as a brake
  on scripted attempts.
- Capacity conversations: "how many requests per second can tenant X burst to, and settle at" is
  a token bucket question with a precise answer, not a guess.

## One sentence summary

> A token bucket lets a dealer burst up to its capacity and then settle at its refill rate, and
> giving every dealer their own bucket keeps one noisy neighbor's script from eating into
> everyone else's share, as long as a rejected request comes back as a 429 with a Retry-After a
> well-behaved client will actually honor.

## Check question

Dealer 7 has a bucket with capacity 6 tokens, refilling at 3 tokens per second, currently full.
Their app fires 9 requests in the same instant. How many succeed immediately, how many get
rejected, and roughly how long should the `Retry-After` on the first rejected request tell them
to wait before even one more token is available?
