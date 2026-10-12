# Lesson 14 · Three counters and a manager at the door

**Reading time:** 12 min · **Concept:** stateless service, horizontal scaling, load balancing algorithms, health checks
**Mission:** 14

## The problem

Your ordering service runs on one machine. Campaign day arrives, traffic triples, and that one
machine is maxed out: CPU pinned, Tomcat threads full, dealers getting timeouts. You cannot make
the machine faster today. What you can do is run three copies of it and put someone at the door
deciding which copy each dealer walks up to.

That "someone at the door" is a **load balancer**: a component that sits in front of several
copies of your service and routes each incoming request to one of them.

## Why it is hard

Running three copies sounds like "just start it three times", but two things can quietly break
it. First, if any copy remembers something about a dealer in its own memory (their shopping
cart, their last search), then that dealer must always land on the same copy, or their data
disappears depending on who answers the door. Second, if one of the three copies is already
struggling, routing more traffic to it on a fixed rotation makes it worse, not better.

## The idea: three counters at a bakery

Picture a bakery with three service counters, each staffed by one baker, serving from the same
oven and the same recipe book behind them. A manager stands at the entrance and sends each
customer to a counter.

### Why three counters only help if nobody is "the regular's counter"

Suppose counter 2 remembers, in the baker's head, that the customer in line ordered "the usual"
last time and keeps a running tab there. Now that customer must always go to counter 2. If
counter 2 is busy, they wait even though counters 1 and 3 are free. Worse, if counter 2's baker
goes home sick, that customer's tab is gone.

The fix: nothing a customer needs survives only in one baker's head. The tab is written on a
shared board behind all three counters (the database), or on a card the customer keeps (a token
in the request itself). Any baker, at any counter, can serve any customer, because no counter
holds private state about them.

A service built this way is **stateless**: any instance can handle any request, because nothing
a later request needs lives only in that instance's memory. Your dealer ordering service already
has to be stateless for three counters to work at all: stock counts and order history live in
Postgres, not in a Java field. Running more copies of a stateless service to handle more load is
**horizontal scaling**, as opposed to buying one bigger machine (vertical scaling).

### How the manager decides who goes where

**You** are the manager. Customers keep arriving and you must pick a counter for each one,
instantly, without knowing how long their order will take. A few strategies:

- **Round robin**: counter 1, then 2, then 3, then 1 again, no matter what. Simple, and fair if
  every order takes about the same time. Nine customers in a row give each counter exactly 3.
- **Least connections**: send the next customer to whichever counter currently has the fewest
  people still being served. This adapts when orders are uneven: if counter 2 just got someone
  with a huge wedding cake order, round robin would still send it more customers; least
  connections would not.
- **Weighted**: if one counter has a trainee baker who is slower, give it a smaller share, say
  one customer for every two the experienced bakers get.

Your lab's load balancer sits in front of the three app instances the same way: it does not know
which request is a one-row price lookup and which is a slow order with a stock check and a
payment call. Least-connections style routing adapts to that; pure round robin does not.

### The manager also has to notice a sick baker

If a baker at counter 3 collapses, the manager must stop sending customers there immediately,
not after ten more people pile up in front of an empty counter. The load balancer does this with
a **health check**: it periodically asks each instance a simple question, usually by calling a
small `/health` or `/actuator/health` endpoint, and expects a quick "yes, I'm fine". Miss enough
checks in a row and the load balancer stops routing new requests to that instance until it
answers again. A check every 5 seconds means the manager glances down the counter twelve times a
minute, which is often enough to catch a problem without hammering a struggling instance with
extra probe traffic.

Health checks answer a narrower question than "is this instance healthy" sounds like. A common
split: **liveness** ("is the process still running, or should it be restarted") and
**readiness** ("is it currently able to take traffic, for example has it finished connecting to
the database"). A fresh instance can be alive but not yet ready. You will meet this split again
when you look at graceful restarts later in the lab.

### What still cannot be split across three counters

Three instances do not triple everything. They share one Postgres database behind them; its
connection pool, from lesson 02, is still one shared resource, and `λ_max = pool / W` still
applies, just now three instances are drawing from (by default) three separate pools of 10 each,
competing for the same database. Three instances also do not fix a per-tenant rate limiter kept
in each instance's own memory, from lesson 13: a dealer bouncing between counters would get a
fresh bucket at each one, defeating the limit entirely. That is exactly why shared state like a
rate limit or a cache belongs in something all instances can see together, such as Redis,
not in any one instance's memory.

## Where you will meet this

- Any "scale out" conversation: adding instances only helps the part of the system that was
  actually the bottleneck; a shared database or cache can still cap you.
- Rolling deployments: new code goes out to one instance at a time, failing its health check
  during startup so the load balancer waits before sending it traffic.
- Incident reviews where "it only broke for some users": often the sign of accidental state
  tying a user to one instance.

## One sentence summary

> Horizontal scaling only works if every instance is interchangeable, which means all the state
> a request needs lives in the database or cache behind them, never only in one instance's memory.

## Check question

You run 4 instances behind a load balancer using round robin. Instance 2 is twice as slow per
request as the other three because of a misconfiguration. After 20 requests arrive in strict
round-robin order, has instance 2 finished its share, fallen behind, or come out ahead, and what
routing strategy would have avoided the problem?
