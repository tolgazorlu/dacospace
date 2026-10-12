# Lesson 09 · Open the circuit

**Reading time:** 13 min · **Concept:** circuit breaker states (closed/open/half-open), failure rate threshold, bulkhead, fallback
**Mission:** 09

## The problem

Last mission you taught the order service to retry a failed payment call instead of giving up on
the first error. That helped with the occasional blip. Now imagine the payment provider does not
blip, it goes properly down for two minutes: every call times out after its full timeout. Every
retry on top of that times out too. You now have requests that each spend "timeout times retries"
seconds before failing, and for every one of those seconds they are holding a thread and, if the
call sits inside the transaction, a database connection as well. Two minutes of a dead provider
can produce several minutes of your own service being unusable, for orders and for everything else
that needed a thread or a connection.

Retrying made sense when failure was rare. It makes things worse when failure is certain.

## Why it is hard

Nothing in your code currently distinguishes "the provider failed once, bad luck" from "the
provider has failed on every call for the last 30 seconds, it is down". A retry policy looks only
at the call in front of it. To stop hammering a dead dependency you need something that remembers
recent history and makes a decision for the *next* call based on it, before that call even starts.
That something also has to recover on its own: nobody wants to be paged at 3 a.m. just to flip a
switch back on once the provider comes back.

## The idea: a fuse that trips

You know this pattern from your fuse box at home. Too much current flows, the fuse trips, and the
whole circuit goes dead, on purpose, before a wire overheats. You do not stand there testing the
wiring with your finger; the fuse trips automatically and you reset it once things are safe. A
**circuit breaker** in software is the same fuse, placed in front of a call you do not fully
control.

A circuit breaker has three states:

- **Closed**: normal operation. Calls go through to the provider and the breaker quietly counts
  how many succeeded and how many failed in a recent window.
- **Open**: the fuse has tripped. New calls do not reach the provider at all; they fail instantly
  (or run a **fallback**, more on that below) for as long as the breaker stays open.
- **Half-open**: after a cooldown, the breaker lets a small number of calls through as a test,
  to see whether the provider has recovered, without yet committing to full traffic.

### Deciding when to trip: the failure rate threshold

Say your breaker watches the last 10 calls to the payment provider and trips when 50% or more of
them failed. Walk through two windows:

```
Window A (calls 1-10):   F F S S S S S S S S   -> 2 failures out of 10 = 20%
Window B (calls 11-20):  F F F F F F S S S S   -> 6 failures out of 10 = 60%
```

20% is below the 50% threshold, so after window A the breaker stays **closed**. 60% is above it,
so somewhere inside window B the breaker trips to **open**. From that point on, calls to the
provider stop; every request gets an immediate answer instead of waiting out a timeout it was
never going to win.

### Testing recovery: half-open

After, say, a 30-second cooldown, the breaker moves to **half-open** and lets through a handful of
trial calls, maybe 3. If 2 of those 3 succeed, the breaker decides the provider is healthy again
and goes back to **closed**, resuming normal traffic. If instead 2 of the 3 still fail, the
breaker has learned nothing changed, and goes straight back to **open** for another cooldown. The
trial calls are the only traffic the still-maybe-broken provider receives, so a half-open breaker
cannot make an outage worse the way unthrottled retries can.

Notice what the breaker is really doing: turning "did this one call fail?" into "has this
*dependency* been failing?" and acting on the second question, which is the one that actually
matters.

## Bulkhead: stopping one leak from sinking the ship

A circuit breaker protects you from calling a dead provider. It does not, by itself, protect you
from a *slow* one still soaking up every thread you have, the way lesson 07 described. For that
you want a **bulkhead**: a wall, borrowed from ship design, where the hull is divided into
watertight compartments so that a hole in one compartment floods only that compartment, not the
whole ship.

Applied to your service, a bulkhead means giving calls to the payment provider their own bounded
pool of threads (or permits), separate from the pool that serves `GET /api/products` or
`GET /api/dealers/{id}/orders`. If the payment provider gets slow, it can exhaust *its own* small
pool, but the price-list endpoint keeps a working set of threads of its own and keeps answering
dealers who are not even placing an order. Without a bulkhead, one struggling dependency can
quietly starve endpoints that have nothing to do with it, exactly as you saw happen through the
shared Tomcat thread pool.

## Fallback: what do you answer while the fuse is open?

An open breaker still has to return *something*. Doing nothing, or throwing an unhandled 500, is a
missed opportunity: you already know the provider is unreachable, so you can choose the response
on purpose. A **fallback** is that deliberate choice instead of an accident. Options you will
recognize from everyday apps:

- Return a clear, fast error: "Payment is temporarily unavailable, try again shortly" instead of
  a request that hangs for seconds and then fails anyway.
- Serve something safe from what you already have, such as a previously cached price, when
  staleness is acceptable and correctness is not at risk.
- Degrade the operation: accept the order as "pending verification" and settle payment later,
  if your business is comfortable with that trade-off.

What a fallback must never do is quietly pretend success on an operation that moves money. For
`POST /api/orders`, "fail fast and clearly" is almost always the right fallback; a fake "order
placed" response would be worse than an honest error.

## Where you will meet this

- Any call to a dependency you do not operate: a payment provider, a shipping-rate API, another
  team's internal service.
- Spring Boot's resilience support lets you declare this directly with annotations, and
  Resilience4j supplies the circuit breaker implementation underneath.
- Incident write-ups: "the breaker opened at 09:14 and absorbed the outage" is the sentence you
  want to be able to write instead of "every thread was blocked for four minutes".

## One sentence summary

> A circuit breaker turns "is this one call failing?" into "has this dependency been failing?" and
> once it has, it stops sending traffic, tests recovery carefully through a half-open state, and
> answers every call in the meantime with a fallback you chose on purpose.

## Check question

A breaker watches the last 10 calls and trips at a 50% failure threshold. In the current window,
4 of the last 10 calls have failed. Is the breaker open or closed right now? If it is in
half-open state testing 3 trial calls and the first 2 succeed but the 3rd fails, what should
happen next, and why does limiting the test to a few calls matter?
