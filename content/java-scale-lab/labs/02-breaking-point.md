# Mission 02 · 09:00 rush: the breaking point

**Time:** 60-90 min · **Concept:** Little's Law, connection pool, saturation
**Lesson:** 02 · **Curriculum link:** system design 0.2 and 1.4(c)

## Scenario

Campaign day. Dealers opened the price list this morning, now they place orders. 80% of the
orders contain one of the 20 campaign products. Your boss asks: **"How many orders per second
can we take?"**

In mission 01 you saw the price list handle a lot of traffic. The order path is different: it
lowers stock in the database, calls the payment provider, and writes rows.

## 1. Calculate first (on paper, BEFORE the big test)

First measure how long one order takes under light load:

```bash
./lab load orders 20
```

Take `med` from the output as `W`. Find `maximum-pool-size` in `application.yml`.

Now write the 4 steps:

1. **What is broken?** You don't know yet. Write the question: "above how many orders/s does it break?"
2. **Numbers:** `W` = ? s, pool = ? connections.
3. **The request's path:** read `OrderService.place()`. When does the request take a
   connection, and when does it give it back? (Hint: `@Transactional`.) Write the path in order.
4. **Math:** if each request holds one connection for `W` seconds, how many requests per second
   can 10 connections finish at most? `λ_max = pool / W`

Write the result: "The system breaks above ___ orders per second."

## 2. Measure

One test below your prediction, one above:

```bash
./lab load orders 40
./lab load orders 80
```

Watch the **DB connection pool** panel. When does the `pending` line leave zero?

## 3. Experiment: does a bigger pool fix it?

In `application.yml` change `maximum-pool-size: 10` to `30`, restart the app, run the same test:

```bash
./lab load orders 80
./lab compare orders
```

Predict before you look: will p95 get 3x better? Then measure. If it did not do what you
expected, find out why:
- What does the **Outbound HTTP (payment provider)** panel show?
- Run this in the middle of a test. Is it above zero? (Think about the campaign product rows.)

```bash
./lab sql "SELECT count(*) FROM pg_stat_activity WHERE wait_event_type = 'Lock'"
```

When you are done, **set the pool back to 10**. The real fix comes in missions 05 and 06.

## 4. Evidence

| | 20/s | 40/s | 80/s | 80/s (pool 30) |
|---|---|---|---|---|
| p95 | | | | |
| max pool pending | | | | |
| dropped iterations | | | | |

How far (in %) was your calculated `λ_max` from the real breaking point?

## 5. In your own words

One sentence: which two numbers do you give your boss to answer "how many orders per second"?

## Check question

If `W` drops from your measured value to 0.05 s and the pool stays the same, what is the new
capacity in orders/s? Which line of `place()` would you move outside the transaction to get
there? (Only write it down, don't change it. That is mission 05.)

## Java corner

`OrderService.place()` has `@Transactional`. Explain to yourself:
- What does Spring do at the start and end of the method when it sees this annotation?
- If the method throws an exception, what happens to the stock change?
- Is the `payments.charge(...)` line inside or outside the transaction?
