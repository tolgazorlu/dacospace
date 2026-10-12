# Lesson 21 · 400k orders to 40 million

**Reading time:** 11 min · **Concept:** table partitioning, partition pruning, archiving, vacuum and bloat
**Mission:** 21

## The problem

The `orders` table has 400,000 rows today and an index on `dealer_id`, so "my last 20 orders"
is fast. The business plans for a hundred times that volume, 40 million rows, over the next few
years. An index keeps lookups fast as a table grows, mostly. What it does not fix is everything
*around* the table: backups take longer because there is more to copy, deleting old data means
scanning millions of rows to find a handful, and routine cleanup work has to crawl a table that
no longer fits comfortably in memory. The table did not get slow to query. It got expensive to
own.

## Why it is hard

An index answers "find row X" quickly no matter how big the table is. It does nothing for
questions about the table as a whole: "remove everything older than two years", "how much disk
does recent data use versus old data", "why did last night's maintenance job take four hours
instead of twenty minutes". Those problems scale with the table's total size, not with how fast
any one query runs, so they stay invisible until the table has grown enough to make them painful,
and by then the data is already there.

## The idea: twelve monthly binders instead of one giant one

Imagine the bakery again, but now imagine every sale, ever, going into one enormous ring binder.
After a year it is thousands of pages thick. Someone asks "show me this month's sales" and you
flip through the whole binder looking for pages with this month's date, because nothing tells you
where this month starts and ends inside it.

Now split it differently: one binder per month. January's binder has only January's pages.
"Show me this month's sales" means picking up exactly one binder, the current one, and reading
all of it. "Show me last year's totals" means picking up twelve binders instead of one giant one,
but still not touching anything outside that range. You never again flip past pages that cannot
possibly match.

That is **table partitioning**: instead of one table, Postgres keeps several physical tables
(the "binders") that together behave like one logical table, split by a rule you choose, here by
`created_at` into monthly ranges. You still write `INSERT INTO orders` and `SELECT * FROM orders
WHERE ...` exactly as before; Postgres decides which partition each row belongs to and which
partitions a query needs to touch.

### Partition pruning

When a query's `WHERE` clause mentions the partitioning column, Postgres can work out in advance
which binders cannot possibly contain the answer and skip them entirely without opening them.
That skipping step is called **partition pruning**. A query for `created_at >= '2026-03-01'` on
a table partitioned by month only opens March's partition (and later ones, if any), not the other
eleven. If a table has 40 million rows spread evenly across, say, 48 monthly partitions, that is
roughly 833,000 rows per partition; a query pruned down to one partition reads about 2% of the
table instead of all of it, index or no index. Pruning and indexes work together: pruning picks
the right binder, the index then finds the right page inside it.

Pruning only helps when the query actually constrains the partitioning column. A query that scans
`WHERE dealer_id = 42` with no date filter still has to check every partition, because that
dealer's orders could be in any of them. Choosing the partition key is choosing which questions
get this shortcut for free.

### Archiving: the binders nobody opens anymore

Not every binder needs to stay on the shelf. Orders from three years ago are rarely read and
never written to again. **Archiving** means moving old partitions somewhere cheaper, a separate
"history" table, a different slower database, or cold storage, while keeping the active
partitions in the fast path. With range partitioning, archiving an old month can be as simple as
detaching that partition and copying it out, rather than deleting 833,000 rows one by one with a
`DELETE` statement that has to find them first.

## Why vacuum and bloat matter at this size

Postgres does not delete a row the instant you run `UPDATE` or `DELETE`. It marks the old version
as dead and keeps it on disk, because another transaction that started earlier might still need
to see it. A background process called **autovacuum** comes along afterward and reclaims the
space the dead versions were using. At 400,000 rows this is background noise you never notice. At
40 million rows with a steady stream of updates (say, stock or status columns changing on recent
orders), dead rows can accumulate faster than autovacuum clears them, a state called **bloat**:
the table and its indexes take up far more disk space than the live data would need, and every
scan has to step over dead rows it will throw away, the same wasted work as the "Rows Removed by
Filter" you saw with a missing index, except now it is happening even with a good index in place.

Partitioning helps here too: autovacuum works partition by partition, so a small, mostly
write-once partition from last month vacuums quickly, instead of one enormous table where a
single vacuum pass has to walk all 40 million rows to find the handful that actually changed.

## Where you will meet this

- Any table that is append-heavy and time-ordered: orders, events, audit logs, sensor readings.
- "The nightly backup used to take 10 minutes, now it takes 3 hours": total table size, not query
  speed, is the thing that grew.
- "We need to delete data older than our retention policy": detaching and dropping a partition is
  close to instant; `DELETE` on millions of scattered rows is not.

## One sentence summary

> Partitioning splits one huge table into many smaller ones by a key like time, so a query that
> names that key can prune away the partitions it cannot possibly need, and routine maintenance
> works on the small pieces instead of the whole, ever-growing table.

## Check question

A table has 48 monthly partitions holding 40 million rows total, roughly evenly spread. A report
needs "all orders from the last 3 months" and the query filters on `created_at`. Roughly what
fraction of the table's partitions does it need to open, and roughly how many rows is that,
compared to a query with no date filter at all?
