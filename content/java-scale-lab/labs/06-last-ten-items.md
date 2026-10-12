# Mission 06 · The last 10 items

**Time:** 45-60 min · **Concept:** race condition, lost update, atomic conditional UPDATE, optimistic locking
**Lesson:** 06 · **Curriculum link:** system design 2.1

## Scenario

A campaign product has 10 units left. At 09:00:00 a hundred dealers press "Order" within the same
second. Finance later finds more invoices than units in the warehouse. Today you reproduce that
second on purpose and make it impossible.

## 1. Predict first

Read how `place()` lowers stock (in your code after mission 05, it is the reserve step). It reads the
product, checks `stock >= quantity`, then writes `stock - quantity`.

- 100 dealers, 1 unit each, stock 10. How many orders will be accepted? Write a number.
- What will the final stock be?

## 2. Reproduce

`./lab race` sets product 20000 to stock 10, fires 100 orders at once, and prints what happened:

```bash
./lab race
```

## 3. Watch two requests interleave (on paper)

Draw two columns, request A and request B. Both read `stock = 1`. Write each step in time order
until both have written. This drawing is the whole lesson: if you can draw it, you understand it.

## 4. The 4 steps (on paper)

1. **What is broken:** one sentence with the words "read", "check", "write".
2. **Numbers:** orders accepted vs stock, final stock.
3. **Path:** the three statements Hibernate sends for one line of an order.
4. **What can break:** where exactly can another request slip in?

## 5. Fix it

Make the check and the decrement one atomic step. Options, pick one and be able to defend it:

- a single conditional `UPDATE ... SET stock = stock - ? WHERE id = ? AND stock >= ?` and check the
  number of updated rows (Spring Data: `@Modifying @Query`),
- optimistic locking with a `@Version` column (needs a Flyway migration) and a retry on conflict,
- `SELECT ... FOR UPDATE` (pessimistic lock) before the check.

If you return stock when a payment fails (mission 05), make that atomic too.

```bash
./lab race
./lab load orders 20
```

The second test proves you did not break normal orders, and shows what your choice costs on the hot
campaign rows.

## 6. Evidence

| | Before | After |
|---|---|---|
| orders accepted (stock 10) | | |
| final stock | | |
| orders 20/s p95 | | |
| orders 20/s failed % | | |

## 7. In your own words

One sentence: why does a correct-looking `if` not protect stock?

## Check question

You choose optimistic locking. 100 dealers race for 10 units. How many requests will see a version
conflict at least once, roughly, and what should your code do with them?

## Java corner

- What does `@Modifying` change about how Spring Data runs a `@Query`?
- After a bulk `UPDATE` query, the `Product` entity already loaded in the same persistence context still
  shows the old stock. Why, and when does that matter?
