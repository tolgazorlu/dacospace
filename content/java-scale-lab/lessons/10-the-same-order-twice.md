# Lesson 10 · The same order twice

**Reading time:** 11 min · **Concept:** idempotency key, client retries after timeout, unique constraint, storing the first response
**Mission:** 10

## The problem

A dealer taps "Place order" on a bakery's weekly flour order. The screen spins. Three seconds
pass, nothing happens, the dealer's train goes into a tunnel and the connection drops entirely.
On the dealer's phone, the app does the sensible thing: it retries the same request once the
connection comes back. Meanwhile the dealer, seeing a still-spinning screen moments earlier, had
already tapped the button a second time out of impatience. Two, maybe three copies of the same
`POST /api/orders` arrive at your service. Stock gets reserved twice, the payment provider gets
charged twice, and the dealer ends up with two identical orders for flour they only wanted once.

## Why it is hard

Lesson 08 taught you that retries are the right move when a call might have failed before doing
anything. But `POST /api/orders` is not that kind of call: it lowers stock, charges a card, and
writes a row. Run it twice and you get two real-world effects, not one effect done twice safely.
The client cannot tell, from a timeout alone, whether the server never received the request, or
received it and the response just got lost on the way back. Retrying is the right instinct; doing
the same side effect twice is the wrong outcome. You need a way to retry the *request* without
repeating the *effect*.

## The idea: a key the client hands you once

The fix does not live on the server alone, it is a contract between client and server. Before
sending the order, the dealer's app generates a random **idempotency key**, a token that
identifies this one logical attempt at placing this one order, no matter how many times the
network makes it try again. The app attaches that same key to every attempt, including retries:

```
Attempt 1 (times out, response lost): POST /api/orders   Idempotency-Key: 7f1e-aa21
Attempt 2 (retry, same key):          POST /api/orders   Idempotency-Key: 7f1e-aa21
```

Your server's job is simple to state: the first time it sees `7f1e-aa21`, do the real work, once.
Every later time it sees `7f1e-aa21`, skip the work and hand back whatever it answered the first
time.

### Making "the first time" safe with a unique constraint

"Check if we have seen this key, then act" sounds simple, but two of the dealer's copies of the
request can arrive at almost the same instant and both see "not seen yet" before either has
finished, the same read-check-write race you fixed for stock in lesson 06. The reliable version
leans on the database instead of a Java `if`: a table with a **unique constraint** on the
idempotency key column.

```sql
CREATE TABLE idempotency_keys (
    key          TEXT PRIMARY KEY,
    order_id     BIGINT,
    response_body TEXT,
    created_at   TIMESTAMP NOT NULL DEFAULT now()
);
```

Both near-simultaneous requests try to `INSERT` a row for `7f1e-aa21`. Postgres guarantees only
one of those inserts can succeed; the second one fails with a unique-violation error, instantly
and for free, because the database itself will not hold two rows with the same primary key. The
request whose insert succeeded goes on to do the real work: lower stock, call the payment
provider, write the order. The request whose insert failed knows, with certainty, that the other
one is doing it (or has already done it), and instead goes to fetch and return the stored result.

### Storing the first response, not just a flag

A common half-measure is to remember only "this key was used" and return a generic
"already processed" message on repeats. That is not good enough here: the retry on the dealer's
phone still needs the actual order confirmation, the order id, maybe the total price, to show the
dealer a receipt. So the row for the first successful attempt also stores the **response body**
that was sent back. Every later request with the same key gets that exact stored response,
byte for byte, as if the real work had just happened again, even though it only happened once.

```
Attempt 1: inserts key, lowers stock, charges card, writes order #501, stores the 201 response.
Attempt 2: insert fails (key exists), reads the stored response, returns the same 201 for order #501.
```

From the dealer's side, both taps on the button, and the automatic retry in between, end up
pointing at the one order, number 501, with the one charge.

### What makes a good key

The key has to come from the client, not the server, because the server cannot tell two separate
taps of the button apart on its own; only the client knows "this is still the same attempt" versus
"this is a brand new order". A key generated fresh for every genuinely new order, and reused only
for retries of that same order, is what makes the whole mechanism work. A key that is the same
for every order from a dealer would wrongly collapse ten different orders into one; a key that is
different on every retry would defeat the purpose entirely.

## Where you will meet this

- Any endpoint that spends money or changes stock behind a client that might retry: payments,
  order placement, ticket booking.
- Payment providers themselves usually require you to send *them* an idempotency key for the
  same reason, one layer further out.
- Code review: "what happens if this POST arrives twice with the same body" is a fair question
  for any endpoint that is not naturally idempotent, such as a plain `GET`.

## One sentence summary

> An idempotency key lets a client safely retry an operation that is not naturally repeatable, by
> having the server do the real work once, behind a unique constraint, and hand back the same
> stored response to every later request carrying that key.

## Check question

A dealer's app sends the same idempotency key three times because of a flaky connection: the
first attempt creates order #220 and charges the card successfully, but the response is lost
before the phone sees it. What should the second and third attempts receive back, and which part
of the design guarantees that the card is charged exactly once rather than three times?
