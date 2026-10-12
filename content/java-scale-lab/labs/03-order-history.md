# Mission 03 · The dealer's order history

**Time:** 60 min · **Concept:** EXPLAIN, seq scan, index, Flyway migration
**Lesson:** 03 · **Curriculum link:** system design 1.4(a)

## Scenario

Dealers open the "my recent orders" screen. The table has 400k orders, about 200 per dealer.
The complaint: "sometimes the screen never opens".

## 1. Measure first

```bash
./lab load dealer-history 50
```

Note: the system may slow down badly during this test. That is normal, that is what you need to see.

Watch **p95 per endpoint** and **DB connection pool** in Grafana. Then:

```bash
./lab topsql
```

Which query spent the most total time? How many calls, what is its mean in ms?

## 2. Open the query

```bash
./lab explain "SELECT * FROM orders WHERE dealer_id = 42 ORDER BY created_at DESC LIMIT 20"
```

Find these in the output:
- Does it say `Seq Scan` or `Index Scan`?
- What is the `Execution Time` in ms?
- You asked for 20 rows. How many rows did Postgres look at?

## 3. The 4 steps (on paper)

1. **What is broken:** one sentence.
2. **Numbers:** query time `W_sql`, queries per request (`calls` in topsql / number of requests),
   50 requests/s × ... → how much pool demand `L`? The pool is 10.
3. **Path:** request → controller → `findByDealerIdOrderByCreatedAtDesc` → Postgres → ...
4. **What can break:** which item eats the time?

## 4. Fix it

Add the index with a **Flyway migration**. Never run `CREATE INDEX` by hand and leave it there:
in production there is no change without a migration.

Create `src/main/resources/db/migration/V2__...sql`. You decide **which columns** the index
covers and **in what order**. Hint: the query both filters (`WHERE`) and sorts (`ORDER BY`).

Restart the app (Flyway runs the migration on startup), then:

```bash
./lab explain "SELECT * FROM orders WHERE dealer_id = 42 ORDER BY created_at DESC LIMIT 20"
./lab load dealer-history 50
./lab compare dealer-history
```

## 5. Still slow?

Be ready for a surprise: the `EXPLAIN` gets dramatically faster, the endpoint may barely move. Run
`./lab topsql` again. Which queries are at the top now? How often are they called? Noticing this is
enough, the fix is mission 04. Write down the `calls` number. Finding out that the query you fixed was
not the bottleneck is a real result, not a failure.

## 6. Evidence

| | Before | After index |
|---|---|---|
| EXPLAIN: scan type | | |
| Execution Time | | |
| dealer-history p95 | | |
| dropped iterations | | |
| top query in topsql | | |

## 7. In your own words

One sentence about what decides the column order of an index. Then commit:
`git commit -m "perf: index orders by dealer and date"`

## Check question

If you had created the index as `(created_at, dealer_id)`, would you get the same speed? Use a
deck of 52 cards to explain: did you sort by suit first, or by number first?

## Java corner

`OrderRepository.findByDealerIdOrderByCreatedAtDesc` has no body. Spring Data builds the SQL
from the method name. Set `show_sql: true` in `application.yml`, send one request, find the SQL
in the log. Which part of the SQL did each piece of the name (`findBy`, `DealerId`, `OrderBy`,
`CreatedAt`, `Desc`) become?
