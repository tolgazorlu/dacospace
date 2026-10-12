# Lesson 07 · The provider stops answering

**Reading time:** 10 min · **Concept:** connect timeout, read timeout, thread exhaustion, fail fast, timeout budget
**Mission:** 07

## The problem

The payment provider does not return an error. It does not return anything. The TCP connection
opens, the request is sent, and then silence. No response, no close, nothing. Your HTTP client,
with no timeout configured, waits. Forever, if you let it. Within a minute, your service, which
has nothing wrong with its own code, stops answering requests too, including ones that have
nothing to do with payments.

## Why it is hard

"No timeout" does not sound like a decision you made. It sounds like the absence of one. But an
HTTP client with no configured timeout has, by default, chosen "wait as long as it takes", and
that choice has a very real cost: whatever thread made that call is now unavailable for anything
else, for however long the other side decides to take, which might be never.

## The idea: the phone call that never ends

Tomcat (your app's HTTP server) answers each incoming request with one thread from a pool, 200
threads in the lab's configuration. A thread handling `POST /api/orders` that calls the payment
provider is **occupied** for the entire length of that call. If the call hangs, the thread hangs
with it, doing nothing, holding nothing useful, just waiting.

Picture a shop with 200 clerks. One customer's card does not go through on the first try, so a
clerk picks up the phone to call the bank, and the bank puts them on hold, forever, no hold music,
no hang-up, just silence. The clerk cannot serve anyone else while holding that phone. Now imagine
more customers arrive whose cards also need a call, and each of those clerks gets put on hold too.
At 5 new such customers per minute (5 per 60 seconds, so roughly one every 12 seconds), it does not
take long before every one of the 200 clerks is on hold, and a customer who only wanted to ask "do
you sell milk" cannot get anyone's attention either.

### Doing the arithmetic

If requests needing the hanging call arrive at 5 per second, and each one permanently occupies a
thread, then: `200 threads / 5 per second = 40 seconds` until every thread is stuck. Forty seconds
after the provider goes silent, your entire service, including endpoints that never call the
payment provider, stops accepting new work. This is **thread exhaustion**: the thread pool runs
out of threads, not because of a surge in legitimate traffic, but because existing threads never
came back.

### Two timeouts, not one

An HTTP client makes two separate promises, and both need a limit:

- **Connect timeout**: how long to wait for the TCP connection itself to be established. If the
  provider's server is unreachable, this fails fast, usually in a few seconds at most.
- **Read timeout**: how long to wait for data once the connection is open and the request has been
  sent. This is the one that matters here: the connection opened fine, the request was sent fine,
  and then nothing came back. Without a read timeout, "nothing came back" means "wait indefinitely".

Both need explicit values. A client with a connect timeout but no read timeout is still exposed to
exactly the scenario above.

### Fail fast, on purpose

Setting a read timeout of, say, 2 seconds does not make the payment provider faster. It makes your
service **fail fast** instead of hang indefinitely: after 2 seconds with no answer, the HTTP call
throws an exception, the thread is freed, and your code can decide what to tell the dealer ("try
again in a moment") instead of leaving them staring at a spinner that will never resolve. Failing
fast trades "maybe it would have answered at 2.1 seconds" for "my service stays alive for every
other dealer". That is almost always the right trade, because the alternative is not "the payment
eventually succeeds", it is "the whole service goes down with it".

### Timeout budget

If `POST /api/orders` itself needs to answer within, say, 5 seconds end to end, then every slow
call inside it has to fit inside that 5 seconds, with room to spare for your own code and the
database. That total allowance is the **timeout budget**. A payment call with a 10 second read
timeout cannot live inside a 5 second budget; it has to be shorter than the budget, not equal to
the whole thing, and definitely not left unset. When a service calls several things in sequence,
their timeouts have to add up to less than what the caller is willing to wait.

## Where you will meet this

- Every HTTP client you configure for the rest of this lab: WireMock will simulate a provider that
  hangs, and you will see exactly this thread-exhaustion curve on the dashboard.
- "The whole app went down but the logs show no errors": a strong sign of threads stuck waiting,
  not threads crashing.
- Any service-to-service call in a microservice setup: each hop needs its own sane timeout, smaller
  than whatever timeout the caller of that hop is working with.

## One sentence summary

> A call with no read timeout can occupy a thread forever, and since the thread pool is finite,
> enough hanging calls eventually stop every endpoint, not just the slow one, so failing fast on a
> short timeout protects the whole service.

## Check question

A service has 50 worker threads. Requests needing a call to a provider that has gone completely
silent arrive at 2 per second, and the HTTP client has no read timeout set. Roughly how many
seconds until the service stops accepting new requests entirely? If a 3 second read timeout were
set instead, would the service still exhaust its threads at that same arrival rate?
