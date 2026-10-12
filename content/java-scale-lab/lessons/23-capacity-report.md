# Lesson 23 · Capacity report

**Reading time:** 13 min · **Concept:** capacity planning, bottleneck chain, headroom, load test to model, writing the report
**Mission:** 23

## The problem

Someone asks a plain question: "we're running a campaign next month that will roughly triple
order traffic, can the system handle it?" You have built indexes, fixed the race condition, added
timeouts, retries, a circuit breaker, idempotency keys, a cache, rate limits, three instances
behind a load balancer, virtual threads, Kafka, a read replica, and partitioning. All of it works.
None of it, on its own, answers "can the system handle three times the traffic", because that
question is not about any one piece. It is about all of them together, and specifically about
whichever one runs out of room first.

## Why it is hard

Every lesson so far studied one resource in isolation: one pool, one cache, one rate limit. A
capacity question forces you to look at the whole chain at once and find the weakest link,
because the weakest link is the only one that matters. Fixing the second-weakest link first
feels like progress and changes nothing: the system still falls over at the same traffic level,
just for a different reason than you expected. This lesson is less a new technique and more the
discipline of putting everything you measured into one answer, written down so someone who was
not in the room can trust it.

## The idea: whichever checkout runs out first sets the limit

Go back to the supermarket one more time, but now it has several things that can run out, not
just checkouts: 10 checkout lanes, a parking lot with 60 spaces, and a loading dock that can
restock shelves at a certain rate. Say the checkouts can process 40 customers a minute (lesson 02:
10 lanes, 0.25 minutes per customer), the parking lot holds 60 cars and the average visit is 20
minutes, so by Little's Law it can admit 60 / 20 = 3 new cars per minute at full occupancy, and
the loading dock can keep shelves stocked for up to 50 customers a minute's worth of shopping.

Three numbers: 40, 3, 50. The supermarket's actual capacity is **3 customers per minute**, the
smallest one, even though two other parts could handle more than ten times that. Pouring money
into a bigger loading dock does nothing: cars are still stuck finding parking. This chain of
dependent resources, where the system's overall capacity equals its single smallest capacity, is
the **bottleneck chain**. Finding the right number to report is finding which link that is, not
listing all of them as if they were equally important.

### The same chain in your app

Walk the same request through your system and write down what each resource can do before it
saturates, using the formulas and rules from earlier lessons, not guesses:

| Resource | Rule | Example number (yours will differ) |
|---|---|---|
| HikariCP pool | `size / W` (lesson 02) | pool 10, W 0.1 s → 100 req/s |
| Tomcat threads | threads / (time a thread is occupied) | 200 threads, 0.2 s each → 1,000 req/s |
| Payment provider | its own quoted limit, minus your circuit breaker's threshold | say 80 req/s before it falls over |
| Rate limiter | sum of per-dealer token buckets currently in use | depends on how many dealers are active at once |
| Cache hit rate | `(1 - hit rate) × raw traffic` hits the database | 80% hit rate turns 500 req/s into 100 req/s at the DB |
| Read replica | its own `size / W`, for reads only | separate number, does not limit writes |

In this made-up example, the smallest number is the payment provider at 80 req/s. That is your
system's capacity for `POST /api/orders`, full stop, until that number changes. The pool's 100
req/s, the cache's help, the three instances: none of it matters past that point, the same way
the loading dock's capacity did not matter once parking filled up.

### Headroom

**Headroom** is the gap between what you can handle and what you currently push through it,
usually written as a percentage: if the bottleneck can do 80 req/s and current peak traffic is 50
req/s, headroom is `(80 - 50) / 80 = 37.5%`. A campaign that triples traffic to 150 req/s does not
fit in 37.5% headroom; it needs the bottleneck itself to move, not a bigger pool somewhere else in
the chain.

## Load testing to build a model, not to find a magic number

A single load test result, "it broke at 85 req/s", is a fact about one afternoon, one database
cache state, one WireMock delay setting. The useful output of a load test is not that number, it
is the **shape** of the curve as you raise load step by step: where p95 starts climbing faster
than traffic, where error rate leaves zero, where a specific resource (the pool's pending count,
a queue depth) starts climbing and does not come back down. That shape is a model you can reason
about for traffic levels you have not tested yet, the same way you did not need to literally run
3,000 customers through the supermarket to know the parking lot runs out at 3 per minute: you
measured the pieces and multiplied.

## Writing the report

A capacity report that another engineer can act on without re-running your tests has four parts,
in this order:

1. **The bottleneck and its number.** One sentence: "the system's write capacity is limited by the
   payment provider's circuit breaker threshold, 80 req/s, not by the database or app instances."
2. **Current headroom.** Current peak traffic, the bottleneck's limit, the resulting percentage,
   and what happens past it (queue grows, errors start, which one, from which earlier lesson).
3. **What changes the bottleneck number**, and what does not. Adding a fourth app instance does
   not raise 80 req/s. A second payment provider or a higher-throughput contract does.
4. **What you actually tested**, including the load test's shape, so the reader can tell a
   measured number from an estimate.

Skip step 1 and the report reads like a list of healthy graphs that does not answer the question
that was asked.

## Where you will meet this

- Any "can we handle the campaign / the Black Friday / the migration" question from someone who
  is not an engineer and needs one clear answer, not six dashboards.
- Budget conversations: "add more servers" is only the right spend if servers are the bottleneck;
  this report is what proves or disproves that before money moves.
- Post-incident follow-up: "we hit capacity" should always end with an updated bottleneck chain,
  not just a bigger number for whichever resource happened to be visible on the dashboard that day.

## One sentence summary

> A system's real capacity is its smallest link, not its average or its best-looking resource, so
> a capacity report names that one link, its headroom, and what would actually have to change to
> move it.

## Check question

Your chain, measured honestly, gives these numbers: pool 120 req/s, payment provider 90 req/s,
rate limiter (summed across active dealers) 150 req/s, cache-backed reads not relevant to this
write path. Current peak write traffic is 60 req/s. What is the system's write capacity, what is
its headroom as a percentage, and does adding a fourth app instance change either number?
