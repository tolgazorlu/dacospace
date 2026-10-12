# Mission 04 · One request, many queries

**Time:** 60-90 min · **Concept:** N+1, Hibernate lazy loading, batch fetching
**Lesson:** 04 · **Curriculum link:** system design 1.4(b)

## Scenario

You added the index in mission 03. The orders query went from tens of milliseconds to under one.
And yet "my recent orders" still falls over at 50 requests per second. The query you fixed was not
the one eating the time. Today you count what the endpoint really sends to Postgres.

## 1. Predict first (on paper)

Read `OrderService.recentOrders()` and `OrderView.from()`. The endpoint returns the last 20 orders of a
dealer, each with its items and each item's product name.

- How many SQL statements does **one** request send? Write a number before you measure.
- Which line of Java triggers the extra ones?

## 2. Count the queries

Reset the statistics, send exactly one request, then look:

```bash
./lab sql "SELECT pg_stat_statements_reset()"
./lab load smoke
./lab topsql
```

The smoke test sends more than one request, so divide. For a clean count, reset again and open
http://localhost:4180/api/dealers/42/orders?limit=20 once in your browser, then run `./lab topsql`.

Write down three numbers: calls of the orders query, calls of the `order_items` query, calls of the
`products` query.

## 3. Find the slow one

The `order_items` query is called many times. How long does each call take (`mean_ms`)? Explain it:

```bash
./lab explain "SELECT * FROM order_items WHERE order_id = 1234"
```

Seq Scan again? Remember lesson 03: Postgres does not index foreign keys for you.

## 4. The 4 steps (on paper)

1. **What is broken:** one sentence that names both problems you found.
2. **Numbers:** queries per request × time per query = time the request holds a connection (`W`).
   With a pool of 10, what is `λ_max`?
3. **Path:** controller → `recentOrders()` → orders query → `OrderView.from()` → ...
4. **What can break:** which one of the two problems would still hurt if you fixed only the other?

## 5. Fix it

Two changes, one commit each:

1. A Flyway migration (`V3__...sql`) that indexes the column the items query filters on.
2. Make Hibernate load the items and products of all 20 orders with a few queries instead of 60.
   You have three tools, pick one and be able to say why: a `join fetch` query, an `@EntityGraph`,
   or Hibernate's batch fetching (`hibernate.default_batch_fetch_size`). Careful: `join fetch` on a
   collection together with a `LIMIT` makes Hibernate paginate in memory. Look for that warning in
   the log if you choose it.

Restart the app, then measure again:

```bash
./lab topsql
./lab load dealer-history 50
./lab compare dealer-history
```

## 6. Evidence

| | Before | After |
|---|---|---|
| SQL statements per request | | |
| mean ms of the items query | | |
| dealer-history p95 at 50/s | | |
| dropped iterations | | |

## 7. In your own words

One sentence: why did the mission 03 index not make this endpoint fast?

## Check question

A page shows 50 dealers, and for each dealer the name of its city's sales rep, loaded lazily. Without
batch fetching, how many queries does the page send? With `default_batch_fetch_size: 25`, how many?

## Java corner

In `Order.java`, `items` is `@OneToMany(fetch = FetchType.LAZY)`. Explain to yourself:
- What object does Hibernate put in the `items` field before you touch it? (Search "PersistentBag".)
- Why does `OrderView.from()` run inside `@Transactional(readOnly = true)`? What exception would you
  get without it, given `spring.jpa.open-in-view: false`?
