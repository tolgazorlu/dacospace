# Lesson 02 · Ten checkouts and a queue

**Reading time:** 10 min · **Concept:** Little's Law, connection pools, saturation
**Mission:** 02

## The problem

A supermarket has 10 checkouts. On a quiet morning nobody waits. At 18:00 the queue reaches the
frozen food aisle. The cashiers did not get slower. The checkouts did not break. Something else
changed, and it changed suddenly: 17:45 was fine, 18:00 was not.

Your Spring app has exactly the same shape. It has a **connection pool**: a fixed number of open
database connections (10 by default with HikariCP) that requests borrow and give back. When all
10 are borrowed, the next request waits in line.

## Why it is hard

Slowness under load feels mysterious because it is not gradual. Doubling traffic does not
double the wait. Below a certain point the wait barely moves; above it, it explodes. If you do
not know where that point is, you find out from your users.

The good news: the point can be calculated, on paper, with one multiplication.

## The idea: Little's Law

Stand at the supermarket entrance with a stopwatch. You count:

- **λ (lambda)**: how many customers **arrive per minute**. Say 6 per minute.
- **W**: how long one customer **spends at a checkout**. Say 1 minute.

Question: on average, how many customers are standing at a checkout right now?

You already know the answer: 6 arrive every minute and each stays 1 minute, so about **6** are
at the checkouts at any moment. That is Little's Law:

```
L = λ × W
L = how many are inside right now
λ = how many arrive per unit of time
W = how long each one stays
```

It works for any system where things arrive, stay a while, and leave: shoppers, HTTP requests,
database connections, messages in a queue.

### Now you run the supermarket

You have 10 checkouts. Each customer takes 1 minute. **You** decide how many customers per
minute you can handle before a queue forms.

L must stay at or below 10. So λ × 1 ≤ 10, which gives **λ ≤ 10 customers per minute**.

- 6 per minute: L = 6. Four checkouts idle. No queue.
- 9 per minute: L = 9. One idle. No queue, but no slack either.
- 12 per minute: L would need to be 12, you have 10. Every minute, **2 more people** join the
  queue than leave it. After 10 minutes, 20 people wait. After 30 minutes, 60.

That last line is the important one. Above capacity, the queue does not settle. It **grows every
second** the overload continues. And the wait for a new customer is no longer "1 minute at the
checkout", it is "1 minute plus everyone in front of you". That is why the wait explodes instead
of growing smoothly.

The name for "every checkout is busy and a queue is forming" is **saturation**.

### Same thing in your app

Translate the supermarket:

| Supermarket | Your Spring app |
|---|---|
| customer | an HTTP request |
| checkout | a database connection from the pool |
| time at checkout `W` | how long a request **holds** the connection |
| 10 checkouts | `maximum-pool-size: 10` |
| the queue | `hikaricp_connections_pending` on the dashboard |

So the capacity of anything behind a pool is:

```
λ_max = pool size / W
```

Example with made-up numbers (not your lab's numbers, you measure those yourself): a pool of 10,
each request holds a connection for 0.25 s. λ_max = 10 / 0.25 = **40 requests per second**.
At 30 per second you are fine. At 50 per second you are adding 10 waiting requests every second.

## The trap: what counts as W

Here is where real systems get it wrong. W is not "how long the SQL takes". W is **how long the
connection is held**. With Spring's `@Transactional`, the connection is taken at the start of the
method and given back at the end. **Everything** inside the method counts: SQL, Java code, and
any slow call to another service that happens to sit inside the transaction.

Imagine a cashier who, halfway through scanning your items, phones the bank to check your card
and waits on hold. The checkout is blocked the whole time, even though no scanning happens.
That is what a slow external call inside a transaction does to your pool.

So there are only two ways to raise capacity:

1. **Lower W**: hold the connection for less time (faster SQL, nothing slow inside the transaction).
2. **Raise the pool**: more checkouts. This helps only if the thing behind the pool (the database
   itself, a locked row, an external API) can actually do more work in parallel. If all
   customers want the same single item from the back room, more checkouts do not help.

Option 1 is almost always the better first move. Option 2 often just moves the queue somewhere
you cannot see it.

## Reading saturation on the dashboard

Three signs appear together when a pool saturates:

1. `pending` connections go above zero and keep climbing.
2. Request p95 jumps far above the time the SQL actually takes.
3. Tomcat busy threads climb toward the maximum (200), because each waiting request occupies a
   thread while it waits. Once threads run out, even endpoints that don't need the database slow
   down. A full pool becomes everyone's problem.

## Where you will meet this

- "We doubled the servers and it did not get faster": the shared database or pool was the limit.
- "Everything got slow when the payment provider got slow": a slow call inside a transaction.
- Capacity planning: "how many orders per second can we take?" is answered with λ_max = pool / W.

## One sentence summary

> A pool can finish at most `size / W` requests per second; above that the queue grows every
> second, so the fix is usually to shrink `W`, not to add connections.

## Check question

You are back at the supermarket: 4 checkouts, each customer takes 30 seconds. How many customers
per minute can you serve before a queue forms? If 10 customers arrive per minute for 5 minutes,
roughly how many are waiting at the end?
