# Mission 09 · Open the circuit

**Time:** 60-90 min · **Concept:** circuit breaker (closed, open, half-open), fail fast, fallback
**Lesson:** 09 · **Curriculum link:** system design 2.4

## Scenario

The provider answers, but in 9 seconds. With your timeout and retries from missions 07 and 08, every
order now waits several seconds, ends in failure anyway, and sends the provider three times the
traffic. Everyone loses. Today you teach the app to stop calling a dependency that is clearly broken,
and to check back on its own.

## 1. Measure the problem

```bash
./lab chaos payment very-slow
./lab load mixed
./lab chaos payment normal
```

Write down: p95 of `place order`, provider calls per second (**Payments** tab), max busy Tomcat
threads (**Saturation** tab).

## 2. Predict (on paper)

A circuit breaker watches the last N calls. When too many fail or are too slow, it **opens**: calls
fail at once without touching the provider. After a wait it lets a few test calls through
(**half-open**), and closes again if they succeed.

With the provider broken for the whole test, what do you expect for provider calls per second and
for the p95 of `place order`?

## 3. Fix it

Add `resilience4j-circuitbreaker` and `resilience4j-micrometer` (version 2.4.0) to `pom.xml`. Create a
`CircuitBreaker` bean from a `CircuitBreakerRegistry`, bind its metrics to Micrometer, and run the
provider call through it. Decide and write down:

- the window size and the failure rate that opens the circuit,
- whether slow calls count as failures, and above what duration,
- how long it stays open before trying again,
- where the breaker sits relative to the retry from mission 08, and why that order.

```bash
./lab chaos payment very-slow
./lab load mixed
./lab chaos payment normal
./lab load smoke
```

The last command proves the circuit closes again once the provider recovers.

Check the state in Prometheus (http://localhost:4183):

```
resilience4j_circuitbreaker_state
```

## 4. Evidence

| | Before | After |
|---|---|---|
| p95 place order | | |
| provider calls/s | | |
| max busy Tomcat threads | | |
| smoke after recovery, failed % | | |

## 5. In your own words

One sentence: what does a circuit breaker protect, the caller or the provider?

## Check question

Your breaker opens at 50% failures over the last 20 calls, waits 10 s, then lets 3 test calls through.
The provider recovers at second 4 of the open period. How long until orders succeed again, and what
would happen if you set the wait to 1 s instead?

## Java corner

- `executeSupplier` throws `CallNotPermittedException` when the circuit is open. Should your retry
  retry it? Check your `@Retryable` configuration.
- What should the API return to the dealer when the circuit is open: 500, 502 or 503? Why?
