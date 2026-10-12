# Lesson 05 · Slow payments slow down everything

**Reading time:** 10 min · **Concept:** transaction boundary, holding a pool connection during a remote call, pool exhaustion spreading
**Mission:** 05

## The problem

The payment provider gets slow. Not down, just slow: a card charge that usually answers in 100 ms
now takes 3 seconds. You expect `POST /api/orders` to get slower. It does. What you did not
expect: `GET /api/products` starts timing out too, and that endpoint never talks to the payment
provider at all. A slowdown in one place spread to a place with no connection to it, in the literal
sense: no code path links them. Something else links them.

## Why it is hard

You reason about your code method by method: "this method is slow, that one is fine". But methods
share resources that your source code never mentions. A **connection pool** is a fixed number of
open database connections that requests borrow and return (lesson 02 covered this with checkouts
at a supermarket). If one kind of request starts holding its connection far longer than usual, every
other kind of request that also needs a connection pays for it, even though their own code did not
change at all.

## The idea: the transaction that waits on the phone

A **transaction** is the span of code between "start talking to the database as one unit" and
"commit or roll back", marked in Spring with `@Transactional`. The database connection is checked
out from the pool at the start of that span and given back at the end. Nothing in between is free
with respect to the pool, even the parts that are not SQL.

Picture a cashier halfway through ringing up your groceries. Before finishing, the cashier has to
call the bank to verify your card, and the bank puts them on hold. The cashier does not serve the
next customer while on hold. The checkout lane is occupied, doing nothing, for as long as the hold
music plays. That is what happens when `POST /api/orders` calls the payment provider over HTTP
**while still inside the transaction** that lowers stock and writes the order: the database
connection sits idle in Java's hand for the full length of that HTTP call, because the transaction
has not committed yet and the connection cannot be returned to the pool.

### Doing the arithmetic

Use Little's Law from lesson 02: a pool's capacity is `pool size / W`, where W is how long one
request holds a connection. Take a small pool of 3 connections.

- Normally, the whole order flow (SQL plus a fast payment call) holds a connection for 100 ms.
  Capacity = 3 / 0.1 = **30 orders per second** before a queue forms.
- The payment provider slows to 3 seconds per call, and that call sits inside the transaction.
  W becomes roughly 3 seconds. Capacity = 3 / 3 = **1 order per second**.

Nothing about the SQL changed. One external dependency getting slower cut the pool's throughput
by 30x, because W is "however long the connection is held", not "however long the SQL takes".

### Why unrelated endpoints suffer too

The pool is shared. `GET /api/products` also needs a connection to run its own, perfectly fast
query. If every connection is currently stuck holding the phone for the payment provider, the
product list request waits in line behind them, for a connection it would have used for a few
milliseconds if it could only get one. Tomcat's own thread pool (200 threads) makes this worse:
each waiting request occupies a thread while it waits, so a stuck database pool can eventually
exhaust the thread pool too, and then genuinely unrelated work (health checks, anything) starts
failing.

This is the general lesson, not just about payments: **anything slow that happens while a
connection is held becomes everyone's problem**, because the pool has no notion of "this request
is more important" or "this request has nothing to do with the slow one". It only knows busy or
free.

### The shape of the fix

The structural fix is to never let a slow, unrelated call sit inside the span where a database
connection is held. Either do the remote call before opening the transaction, after committing it,
or restructure the write so the parts that must be atomic with the database do not need to wait on
the network at all. The exact rewrite of this particular endpoint is yours to find in the mission;
the idea to carry forward is: **ask what is inside your transaction boundary, not just what your
SQL looks like**.

## Where you will meet this

- Any `@Transactional` method that also calls another service, sends an email, or writes to a
  queue: all of that time counts against the pool, whether or not it touches SQL.
- "We added more database capacity and it did not help": if W is the real problem, a bigger pool
  just lets more requests get stuck at once.
- Incident reviews where two "unrelated" endpoints degrade together: look for a resource they
  share, usually a connection pool or a thread pool.

## One sentence summary

> A connection is held for the whole transaction, not just the SQL inside it, so one slow remote
> call inside a transaction can starve every other endpoint that shares the same pool.

## Check question

A pool of 5 connections normally holds each connection for 50 ms. A downstream call that used to
take 20 ms, and happens inside the transaction, now takes 2 seconds. Roughly what is the pool's
capacity in requests per second before and after that change? Would adding 5 more connections to
the pool fix the underlying problem?
