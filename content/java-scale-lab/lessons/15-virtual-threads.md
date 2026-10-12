# Lesson 15 · More waiters than the kitchen can feed

**Reading time:** 11 min · **Concept:** platform vs virtual threads, thread-per-request, blocking I/O, pinning
**Mission:** 15

## The problem

Your service has a Tomcat thread pool capped at 200. Every request gets one thread for its
entire life, and that thread sits there doing nothing useful while it waits for the database or
the payment provider to answer. Raise the cap to handle more concurrent requests and each thread
still costs real memory and an OS context switch, so at some number things get worse, not better.
Java 25 offers a different kind of thread that is almost free to create by the thousand. Does
that solve your scaling problem?

## Why it is hard

"More threads" sounds like it should just mean "more capacity". But a thread that is waiting is
still occupying a scarce resource underneath, an OS thread, even while doing nothing. Virtual
threads remove that cost, which feels like it should remove the ceiling entirely. It removes one
ceiling. It does not remove the other one, and mixing the two up leads people to expect a
speed-up that never shows up on the dashboard.

## The idea: waiters and the kitchen

Think of your app as a restaurant. Each request is a table that needs a waiter assigned to it
from the moment they sit down until the bill is paid. That is **thread-per-request**: one thread
is tied to one request for its whole duration, which is how Spring MVC has always worked.

### Platform threads: one waiter per table, and waiters are expensive to hire

A **platform thread** is a real OS thread. Hiring one costs memory (roughly a megabyte of stack)
and the OS has to schedule it. Your restaurant can afford 200 waiters. On a normal night that is
plenty. On campaign day, with more tables full than you have waiters, new customers wait at the
door even though every current table is just sitting there waiting for food from the kitchen,
not actually being served. The waiters are not cooking, they are blocked, but they are still
"hired" and unavailable for a new table. This is the exact 200-thread ceiling you have in Tomcat.

### Virtual threads: a waiter who can park a table and go help someone else

A **virtual thread** is a thread managed by the JVM instead of the OS. It is cheap enough to
create millions of them. When a virtual thread hits **blocking I/O**, waiting on the database, a
socket, a payment call, the JVM can park it and hand its underlying OS thread (called the
**carrier thread**) to a different virtual thread that is ready to do work. Your restaurant now
has, say, 8 real cooks acting as carrier threads, but thousands of waiters who, the moment their
table is just waiting on the kitchen, step aside and pick up a different table that needs
attention right now. You enable this in Spring Boot with one line:

```properties
spring.threads.virtual.enabled=true
```

With this on, the request-handling threads become virtual. The practical effect: you can have
10,000 requests simultaneously waiting on something slow, and it costs you almost nothing,
instead of needing 10,000 platform threads you could never afford.

### The catch: pinning

A virtual thread can only step aside while it is doing the *kind* of waiting the JVM can see
through, essentially I/O and locks. When it cannot step aside, it stays glued to its carrier
thread (the small set of real OS threads that run virtual threads) while it waits. This is called
**pinning**. A pinned virtual thread behaves exactly like an old-fashioned platform thread: it
occupies a carrier for as long as it waits, and with only a handful of carriers, a few pinned
threads can stall everyone.

On Java 21, the classic cause was blocking inside a `synchronized` block or method. Java 24
removed that case (JEP 491), so on the lab's Java 25 `synchronized` is no longer the problem you
will read about in older blog posts. Pinning still happens when a virtual thread blocks inside
native code, for example a library that calls C through JNI, or inside some class
initialisation. The lesson is the same either way: virtual threads only help when the waiting is
the kind the JVM can park.

### What virtual threads do not touch

Here is the part that surprises people. Go back to Little's Law from lesson 02:
`λ_max = pool size / W`. Your Postgres connection pool is still 10. A virtual thread waiting for
a database connection is not waiting for a *thread*, it is waiting for one of those 10
connections to free up. Giving the app 10,000 cheap virtual threads does not create an eleventh
database connection. The math does not change:

```
pool of 10, W of 0.25 s per request → λ_max = 10 / 0.25 = 40 requests per second
```

That ceiling is identical whether 200 platform threads or 10,000 virtual threads are waiting on
it. What changes is where the queueing becomes visible, and how cheaply the app can hold many
requests "in flight" at once without falling over from thread exhaustion first. Virtual threads
move the bottleneck back to where it actually lives, your database, your payment provider,
instead of letting an arbitrary thread-pool number become the bottleneck before the real one
even gets tested.

### A second thing they do not fix: CPU-bound work

If a request spends its time doing real computation, say, building a large report in memory,
not waiting on anything, a virtual thread offers no advantage: there is no I/O wait to park
during, so it behaves like a platform thread the whole time it runs. Virtual threads help with
*waiting*, not with making the CPU faster.

## Where you will meet this

- "We turned on virtual threads and nothing got faster": almost always the database pool, or
  another fixed resource, was the real limit the whole time.
- Older code reviews and blog posts that ban `synchronized` because of pinning: true on Java 21,
  no longer true from Java 24. Check which Java a piece of advice was written for.
- Load testing: watching whether Tomcat's thread count or the pool's pending count is the one
  that climbs first tells you which ceiling you are actually hitting.

## One sentence summary

> Virtual threads make waiting almost free, so the thread pool stops being an artificial ceiling,
> but they cannot add a connection to a pool that is still capped at 10.

## Check question

You enable virtual threads and your database pool stays at 10 connections, each request holding
one for 0.2 seconds. Before, with 200 platform threads, you could have at most 200 requests
in flight at once; now you can have thousands in flight. Does the maximum number of requests
your service *completes* per second go up, down, or stay the same, and why?
