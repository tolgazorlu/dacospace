# Mission 05 · Slow payments slow down everything

**Time:** 60-90 min · **Concept:** transaction boundary, connection held during a remote call
**Lesson:** 05 · **Curriculum link:** system design 2.4

## Scenario

Campaign day, 10:30. The payment provider has a bad morning: every charge takes 2 seconds instead of
150 ms. Dealers who are only **browsing the price list**, who never touch payment, start calling
support: "the app froze". Today you find out how a slow dependency in one endpoint takes down another.

## 1. Measure a normal day first

`mixed` sends 30 price list requests and 10 orders per second at the same time, and reports p95 per
endpoint:

```bash
./lab chaos payment normal
./lab load mixed
```

Write down p95 for `list products` and for `place order`.

## 2. Predict (on paper)

The provider now takes 2 s per charge. Read `OrderService.place()`.

- How long does one order hold a database connection now?
- With 10 orders per second, how many connections do orders want at the same time (`L = λ × W`)?
  The pool has 10.
- What happens to a price list request that needs a connection for 2 ms?

## 3. Break it

```bash
./lab chaos payment slow
./lab load mixed
```

Watch **DB connection pool** and **p95 per endpoint** in the live panels. Then put the provider back:

```bash
./lab chaos payment normal
```

## 4. The 4 steps (on paper)

1. **What is broken:** the price list is slow, but why? One sentence that names the shared resource.
2. **Numbers:** `W` of an order before and during the incident, `L` for orders, pool size.
3. **Path:** write the order path and mark where the connection is taken and given back.
4. **What can break:** which step holds the connection without using it?

## 5. Fix it

Restructure `place()` so no database connection is held while the provider is called. A common
shape is three short steps: reserve stock and write a `PENDING` order in one transaction, call the
provider with no transaction open, then mark the order `PAID` in a second transaction. Decide what
happens to the reserved stock when the charge fails, and implement it.

Hints: `@Transactional` on a method called from the same class does not start a transaction (Spring
proxies). `TransactionTemplate` lets you run a block in a transaction explicitly.

Then run the same incident again:

```bash
./lab chaos payment slow
./lab load mixed
./lab chaos payment normal
./lab compare mixed
```

`place order` will still be slow: the provider is slow. That is fine today. What must change is
`list products`, and the pool panel.

## 6. Evidence

| | normal day | slow provider, before | slow provider, after |
|---|---|---|---|
| p95 list products | | | |
| p95 place order | | | |
| max pool pending | | | |
| failed % (place order) | | | |

## 7. In your own words

One sentence: what should never sit inside a database transaction, and why?

## Check question

After your fix the provider gets even slower: 8 s per charge, 10 orders per second. Does the price list
stay fast? What runs out first now, if anything? (Hint: Tomcat has 200 threads.)

## Java corner

- Why does a call from `place()` to another `@Transactional` method of the same class not open a new
  transaction? What does Spring's proxy have to do with it?
- In your `PENDING` order, which fields are already final and which are filled in later?
