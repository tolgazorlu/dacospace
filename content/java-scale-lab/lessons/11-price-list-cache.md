# Lesson 11 · Price list cache

**Reading time:** 11 min · **Concept:** Redis, cache-aside, TTL, what to cache, staleness
**Mission:** 11

## The problem

Every weekday at 09:00, dealers open the app to check prices before calling in their orders.
`GET /api/products?category=` runs the same query over and over, often for the same 20 campaign
products that every dealer looks at first. The database does not know that the answer it just
computed for dealer 12 is exactly the answer dealer 850 is about to ask for a minute later. It
recomputes it from scratch every single time, even though nothing about the price list changed in
between.

## Why it is hard

The database is the one place you can fully trust to be correct right now, because every write
goes through it. That trustworthiness is also its cost: being correct right now means doing real
work for every single read, even when a thousand reads in a row are asking the identical
question. You want most of those reads answered from somewhere much faster than the database,
without quietly feeding dealers prices that are wrong.

## The idea: a printed list taped to the counter

Imagine a small shop where the price list could change once a day. The shopkeeper does not walk
to the back office and check the ledger every time a customer asks "how much is this?". Instead,
once a morning, they print the list and tape it to the counter. Customers read the tape. Only
once in a while, when the shopkeeper actually updates a price, do they print a fresh copy.

That taped-up list is a **cache**: a copy of an answer, kept somewhere cheap and fast to read,
so you do not have to redo the expensive work that produced it. In your lab, that cache is
**Redis**, an in-memory data store that sits next to your Postgres database and answers in
well under a millisecond because it never touches disk for a read.

### Cache-aside: check the tape, then the ledger

The pattern you will implement is called **cache-aside**, and it reads exactly like the shop
story, with your Java service playing the shopkeeper on every single request:

1. A request for category "flour" comes in. First, look in Redis for a key like
   `products:category:flour`.
2. **Hit**: the key is there. Return it. The database was never touched.
3. **Miss**: the key is not there. Query Postgres for real, get the answer, write it into Redis
   under that key, then return it to the caller.

The first dealer to ask for "flour" after the cache is empty pays the full price of a database
query, and also does everyone after them a favor by leaving the answer taped to the counter. Every
dealer after that, until the tape comes down, reads it in microseconds.

```java
String key = "products:category:" + category;
String cached = redis.get(key);
if (cached != null) {
    return cached;                       // hit
}
String fresh = productRepository.findByCategory(category);  // miss: ask the database
redis.set(key, fresh, Duration.ofSeconds(60));               // tape it up
return fresh;
```

### TTL: deciding how long you trust the tape

Nobody taped that price list up forever; it gets replaced. A cache entry gets a **TTL**, a
time-to-live, after which Redis simply forgets it. A TTL of 60 seconds means: trust this answer for
up to a minute, then throw it away so the next request goes back to the database and picks up
whatever the current truth is. Pick the TTL by asking "how long can a stale price actually sit
in front of a dealer before it matters?", not by picking a number that merely feels safe.

### What belongs on the tape, and what does not

The price list is a good candidate for caching for a specific reason: it is read far more often
than it is written, and the same answer is correct for every dealer who asks. Compare that with
`GET /api/dealers/{id}/orders`, a dealer's own recent orders. That answer is different for every
dealer, read far less often per key, and a dealer who just placed an order expects to see it
immediately, not after a TTL expires. Caching that endpoint the same way would mostly waste Redis
memory while occasionally showing a dealer a list that is missing the order they just placed.
The rule of thumb: cache data that is read far more than it changes, and whose staleness, for
however long the TTL runs, is something you are comfortable with.

### Staleness is the price you pay

A cache is never perfectly honest about "right now". Between the moment a price changes in
Postgres and the moment the cached copy expires, some dealers see the old price. That gap is
**staleness**. With a 60-second TTL and no other mechanism, a dealer could, in the worst case, see
a price that is up to 60 seconds out of date. If a price change happens right as a cached entry
is written, on average a dealer sees a stale price for about half the TTL before the entry
naturally expires and gets refreshed. That is the trade you are making deliberately: dealers get
answers in microseconds instead of milliseconds, in exchange for prices that can lag reality by up
to one TTL.

If staleness of even a few seconds is unacceptable for some piece of data, such as a dealer's own
current stock reservation, the honest answer is: do not cache it, or invalidate the cached entry
the moment the write happens instead of waiting for the TTL. Caching is a choice you make per
piece of data, not a switch you flip for the whole service.

## Where you will meet this

- Any read-heavy, rarely-changing, shared answer: price lists, product catalogs, configuration,
  feature flags.
- "Why did the price update not show up for a minute" is the support ticket that teaches a whole
  team what TTL means, usually the hard way.
- Every cache you add is also a question you must answer: who updates or removes this key when
  the underlying data changes, and how stale is "stale enough to worry about"?

## One sentence summary

> A cache-aside Redis cache answers repeated, shared reads from memory instead of the database,
> at the cost of a TTL's worth of staleness that you choose on purpose for the data you choose to
> cache.

## Check question

A product's price changes in Postgres at 09:00:00. The cached entry for its category was last
written at 08:59:40 with a TTL of 60 seconds. At what time, at the earliest, will a dealer reading
that category see the new price, and roughly how many seconds of staleness did a dealer who read
it at 09:00:10 experience?
