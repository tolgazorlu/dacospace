# Lesson 03 · Finding one card in a deck

**Reading time:** 10 min · **Concept:** seq scan, B-tree index, column order, EXPLAIN
**Mission:** 03

## The problem

A dealer opens "my last 20 orders". The orders table has hundreds of thousands of rows; this
dealer owns a few hundred of them. The query is one line:

```sql
SELECT * FROM orders WHERE dealer_id = 42 ORDER BY created_at DESC LIMIT 20;
```

It returns 20 rows. Yet it can take longer than queries returning thousands of rows. The number
of rows you **get back** says nothing about the number of rows the database had to **look at**.

## Why it is hard

SQL hides the "how". You say *what* you want and Postgres decides *how* to find it. Most of the
time it chooses well. When it has no good option, it does the only thing it can: read everything.
You won't see that from your Java code. You only see it with `EXPLAIN`.

## The idea: a shuffled deck

Take a normal 52-card deck and shuffle it. Someone asks you: "give me the 7 of hearts".

**You** have no choice: flip cards one by one from the top until you find it. On average you
look at 26 cards; in the worst case all 52. That is a **sequential scan (seq scan)**: read every
row, keep the ones that match.

Now someone asks: "give me all the hearts, highest first". You must flip all 52 (any card could
be a heart), pull out 13, then sort them. Read everything, then sort.

### Now sort the deck first

This time, before anyone asks, **you** sort the deck: first by suit (all clubs, then diamonds,
hearts, spades), and inside each suit by number. Same request: "all hearts, highest first".

You jump straight to where hearts start, and they are already in order. You read 13 cards and
do no sorting. If they ask "the top 3 hearts" you read 3 cards.

That pre-sorted copy is an **index**. Postgres's default index type, the **B-tree**, keeps the
values of some columns in sorted order with a pointer back to each row, and lets it jump to the
right spot in a few steps instead of reading everything.

### Column order matters

You sorted by **suit first, then number**. That order fits the question "hearts, highest first":
suit is the filter, number is the sort.

What if you had sorted by **number first, then suit** (all aces, all twos, ...)? Now "all hearts,
highest first" is awkward: hearts are spread across 13 groups. You have to visit every group.
The deck is sorted, just not in a way that helps this question.

A two-column index works exactly like the deck. The rule of thumb:

- Columns you filter with `=` go **first**.
- The column you `ORDER BY` (or filter with a range like `>`) goes **after** them.

The order of columns in an index is a decision about **which questions it answers fast**.

## Why not index everything?

Indexes are not free. Every sorted copy must be kept sorted. When a new card (row) arrives,
**you** have to insert it into every sorted copy you keep. One index makes writes slightly slower
and uses disk; ten indexes make every insert do ten extra jobs. So you index for the queries you
actually run often, not "just in case".

Also, an index does not help when the filter matches most of the table. If 90% of the cards are
hearts, jumping to "hearts" saves nothing: reading the whole deck is just as fast.

## Reading EXPLAIN

`EXPLAIN ANALYZE` runs the query and shows the plan Postgres chose, with real timings. The parts
to read first:

| You see | It means |
|---|---|
| `Seq Scan on orders` | read every row of the table |
| `Index Scan using ...` | jumped into an index, then fetched matching rows |
| `Sort` | the rows had to be sorted after reading (the index didn't give that order) |
| `rows=` | how many rows a step produced |
| `Rows Removed by Filter` | rows read and thrown away: wasted work |
| `Execution Time` | total time inside Postgres |

A plan that reads hundreds of thousands of rows to return 20 is the deck-flipping you just did by
hand.

## Changing the schema the right way: migrations

In production nobody types `CREATE INDEX` into a console and walks away. Every schema change is a
**migration**: a numbered SQL file committed with the code (`V2__add_index.sql`). On startup,
**Flyway** checks which migrations the database has already run and runs the new ones in order.
Every environment (your laptop, a test container, production) ends up with the same schema, and
the change is reviewed like any other code.

A note for later: on a big, busy table, a plain `CREATE INDEX` blocks writes while it builds.
Real teams use `CREATE INDEX CONCURRENTLY`. You don't need it in the lab, but remember the word.

## Where you will meet this

- Any "list my things" screen: orders by customer, messages by chat, invoices by tenant.
- Foreign keys: Postgres does **not** create an index on a foreign key column for you. A missing
  one is one of the most common slow-query causes in real codebases.
- Code review: "which index serves this new query?" is a fair question for every new query.

## One sentence summary

> Without an index Postgres flips every card; a B-tree index is a pre-sorted copy whose column
> order (filter columns first, sort column after) decides which questions it can answer fast.

## Check question

The query is `WHERE dealer_id = 42 AND status = 'PAID' ORDER BY created_at DESC LIMIT 20`.
Which three columns would you put in the index, in which order, and why? Use the deck to explain.
