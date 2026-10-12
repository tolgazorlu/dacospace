# Mission 08 · Retry, but wisely

**Time:** 60-90 min · **Concept:** transient errors, exponential backoff, jitter, retry amplification
**Lesson:** 08 · **Curriculum link:** system design 2.3

## Scenario

The provider is overloaded and drops every third charge with `503 Service Unavailable`. A third of
your dealers see "payment failed" and order again by hand. Retrying looks like the obvious fix. Today
you add it, measure what it fixes, and measure what it costs.

## 1. Measure the problem

```bash
./lab chaos payment flaky
./lab load orders 10
```

Write down the failed % and p95. In the **Payments** tab, how many calls per second go to the provider?

## 2. Predict (on paper)

You will retry a failed charge up to 2 more times. With "every third call fails":

- what failure rate do you expect for orders?
- how many provider calls per second for 10 orders per second?

## 3. Fix it

Add a retry to `PaymentClient.charge()`. Spring Framework 7 has one built in: `@Retryable`
(package `org.springframework.resilience.annotation`), switched on with `@EnableResilientMethods` on
a configuration class. Decide:

- **which errors** to retry (a `503`? a `400`? a read timeout?) and which never,
- **how many** times,
- **how long to wait** between attempts (`delay`, `multiplier`), and why add `jitter`.

Is a payment charge safe to retry at all? What would make it unsafe? Write your answer down, mission 10
comes back to it.

```bash
./lab load orders 10
./lab compare orders
```

## 4. Now make it worse

The provider goes fully down: every call fails.

```bash
./lab chaos payment errors
./lab load orders 10
./lab chaos payment normal
```

In the **Payments** tab: provider calls per second vs orders per second. You are now sending a
struggling provider more traffic than before. That is **retry amplification**. Mission 09 deals with it.

## 5. Evidence

| | no retry, flaky | retry, flaky | retry, provider down |
|---|---|---|---|
| failed % | | | |
| p95 | | | |
| provider calls/s | | | |

## 6. In your own words

One sentence: when does a retry help, and when does it hurt?

## Check question

Three services call each other in a chain, A → B → C, and each retries 3 times (4 attempts) on failure.
C is down. How many calls reach C for one request to A?

## Java corner

- `@Retryable` works through a proxy, like `@Transactional`. What happens if `charge()` is called
  from inside `PaymentClient` itself?
- What is the difference between `includes` and `excludes` on `@Retryable`?
