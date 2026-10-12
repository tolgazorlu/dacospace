# Lesson 04 · One request, many queries

**Reading time:** 9 min · **Concept:** N+1 queries, Hibernate lazy loading, fetch join / entity graph, batch fetching
**Mission:** 04

## The problem

A dealer opens `GET /api/dealers/{id}/orders` to see their recent orders. One HTTP request, one
click. You watch the query log and dozens of SQL statements scroll past for that single click.
Nobody wrote dozens of queries on purpose. Nobody wrote a loop that calls the database at all. The code looks entirely reasonable. Yet there they are.

## Why it is hard

Hibernate's job is to turn Java objects into rows and back, and it is good at hiding exactly
where a database call happens. You write `order.getItems()` and it looks like a normal getter on
a normal list. It is not. The first time you touch that list, Hibernate quietly runs a query to
fill it in. You cannot tell, by reading the line `order.getItems()`, whether that line is free or
whether it just cost a round trip to Postgres. The cost is invisible in the code and very visible
in the query log.

## The idea: the shop that calls the back room for every single item

Picture a dealer at a counter asking for their last few orders. You, the clerk, fetch the list of
orders from the shelf: one trip. Fine. Now for each order, the dealer wants to see what was in it.
For every order, you walk to the back room and bring the items for that one order. That is one
trip per order. Then, for every item, the dealer wants the product name, not just a product ID.
For every item, you walk to the back room again to look up that one product. That is one trip
per item.

You asked one question ("my orders") and made one trip plus one trip per order plus one trip per
item. That shape, **one query for the main list, then one more query for every related row you
touch**, is called the **N+1 problem**: 1 query to get N parent rows, then N (or more) extra
queries to fill in what hangs off each one.

### Counting it with small numbers

Say a dealer has 3 orders, and each order has 2 items:

1. 1 query: get the 3 orders.
2. 3 queries: for each order, fetch its items (because the items collection is **lazy**, meaning
   Hibernate does not load it with the order, only when the code first reads it).
3. 6 queries: for each of the 6 items total, fetch its product (also lazy, one product lookup
   per item).

Total: 1 + 3 + 6 = **10 queries** for 3 orders. Now take an invoice screen with 30 invoices and
3 lines each. Same shape: 1 + 30 + 90 = **121 queries** for one screen. The user asked one
question. The database answered 121 times.

### Why Hibernate does this by default

Lazy loading exists for a good reason: if every order automatically pulled in every item and
every product every time, you would load far more data than you need for screens that only show
order totals. Lazy loading is the right default. The problem is not that items load lazily. The
problem is loading them **one parent at a time, inside a loop**, instead of **all at once**.

### Three ways out

- **Fetch join**: ask for the orders and their items in a single query, using a join, so Hibernate
  gets everything it needs in one round trip instead of one-plus-twenty.
- **Entity graph**: tell Hibernate ahead of time, "when you load an order, also load its items and
  their products", as a named plan attached to the query, instead of writing the join by hand
  every time.
- **Batch fetching**: instead of fixing the join, tell Hibernate "when you must lazy-load several
  items of the same kind, do it in batches of, say, 20, with one `WHERE id IN (...)` query, instead
  of one query per row". It does not remove the N+1 shape entirely, but it turns 40 queries into 2.

Each tool trades off differently: a fetch join can return duplicate parent rows when a parent has
many children, and loading everything eagerly for a screen that does not need it all wastes work
in the other direction. There is no single correct answer, only "what does this specific screen
actually need".

## Where you will meet this

- Any list screen that shows a parent with its children: orders with items, invoices with lines,
  chats with messages. It is one of the most common causes of a slow-feeling screen that looks
  fast in isolation.
- Code review: seeing a getter called inside a `for` loop over database-backed entities is worth
  a second look every time.
- The query log and the trace: the lab's dashboard will show you span after span of near-identical
  SQL, one per loop iteration, which is the fingerprint of N+1.

## One sentence summary

> N+1 is one query for the list plus one more query per related row you touch inside a loop; the
> fix is always to ask for what you need in one or two round trips instead of one per row.

## Check question

A screen loads 15 invoices, and each invoice has 4 line items that each need their product
looked up. If the code lazy-loads items per invoice and products per line item, one row at a
time, how many SQL queries does that screen run in total? What single change would bring that
number down to close to 1?
