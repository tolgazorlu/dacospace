# Mission 10 · The same order twice

**Time:** 60-90 min · **Concept:** idempotency key, client retries, unique constraint
**Lesson:** 10 · **Curriculum link:** system design 2.1

## Scenario

A dealer places an order on the train. The request reaches you, the order is written and paid, but
the answer is lost in a tunnel. The app does what every good app does: it sends the same request
again. The dealer is now charged twice for one order. Today you make "the same request twice" mean
"one order".

## 1. Reproduce

`./lab double` sends 50 orders for dealer 2000, each one twice with the same `Idempotency-Key`
header, and counts the orders that were written:

```bash
./lab double
```

## 2. Predict and decide (on paper)

- Where must the key be stored so that the second request finds it, even on another instance of the app?
- What should the second request get back: an error, or the first order? Which HTTP status?
- Two copies of the same request arrive at the same millisecond. Both look for the key, neither finds it.
  What stops both from writing an order?

## 3. The 4 steps (on paper)

1. **What is broken:** one sentence.
2. **Numbers:** orders sent, attempts, orders written.
3. **Path:** client → `POST /api/orders` → ... where would you check the key?
4. **What can break:** the race in the last question of step 2.

## 4. Fix it

- Read the `Idempotency-Key` header in `OrderController` (optional header: old clients do not send it).
- Store it with the order, protected by a **unique index** (Flyway migration). The index, not a Java
  `if`, is what decides when two attempts race (remember mission 06).
- A request with a known key returns the first order. Decide the status code (`200` vs `201`) and make
  the controller return it (`ResponseEntity`).

```bash
./lab double
./lab load smoke
```

## 5. Evidence

| | Before | After |
|---|---|---|
| orders written for 50 × 2 attempts | | |
| status of the second attempt | | |
| smoke failed % | | |

## 6. In your own words

One sentence: why is the retry from mission 08 only safe once this mission is done?

## Check question

The first attempt is still waiting for the payment provider (order is `PENDING`) when the second
attempt with the same key arrives. What should the second attempt return, and what must it never do?

## Java corner

- Which exception does Spring throw when the unique index rejects an insert? Where is the right place to
  catch it so the transaction that failed is not reused?
- Why `saveAndFlush` instead of `save` when you rely on the database to detect the duplicate?
