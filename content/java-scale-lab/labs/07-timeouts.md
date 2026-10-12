# Mission 07 · The provider stops answering

**Time:** 45-60 min · **Concept:** connect vs read timeout, thread exhaustion, fail fast
**Lesson:** 07 · **Curriculum link:** system design 2.4

## Scenario

The payment provider does not fail. It does something worse: it accepts the connection and never
answers. No error, no log line, just waiting. Twenty seconds later even the price list is dead,
although mission 05 already moved the payment out of the transaction.

## 1. Predict first

Open `PaymentClient.java`. How long will a charge wait for an answer that never comes? Where does the
waiting thread come from, and how many of them does Tomcat have?

At 10 orders per second, after how many seconds are all Tomcat threads stuck?

## 2. Break it

```bash
./lab chaos payment hang
./lab load mixed
```

Watch **Tomcat threads** (Saturation tab) and **p95 per endpoint**. The test takes longer than usual:
k6 itself waits up to 30 s per request. Then:

```bash
./lab chaos payment normal
```

Requests that were already hanging keep their threads for a while. Restart the app before measuring
again.

## 3. The 4 steps (on paper)

1. **What is broken:** which resource ran out this time? It is not the connection pool.
2. **Numbers:** threads needed = orders per second × seconds each one waits. Compare with 200.
3. **Path:** request thread → `place()` → `PaymentClient.charge()` → ... waits where?
4. **What can break:** what is the longest you are willing to wait for a payment answer, and why that number?

## 4. Fix it

Give the payment client a **connect timeout** (how long to wait for the TCP connection) and a **read
timeout** (how long to wait for the answer). Choose the values from data: the provider's normal p95
is visible in the **Payments** tab. Write down the numbers you picked and why.

Make sure an order whose charge timed out does not keep its reserved stock.

```bash
./lab chaos payment hang
./lab load mixed
./lab chaos payment normal
./lab sql "SELECT status, count(*) FROM orders WHERE created_at > now() - interval '5 minutes' GROUP BY status"
```

## 5. Evidence

| | Before | After |
|---|---|---|
| p95 list products (provider hangs) | | |
| p95 place order | | |
| max busy Tomcat threads | | |
| order statuses written | | |

## 6. In your own words

One sentence: why is "no timeout" never the safe default?

## Check question

Your read timeout is 2 s and you later add 2 retries (mission 08). The provider hangs. How long does one
order now wait at worst, and how many threads does 10 orders/s keep busy?

## Java corner

- `JdkClientHttpRequestFactory` takes a `java.net.http.HttpClient`. Which of the two timeouts lives on
  the `HttpClient` and which on the factory?
- Which exception type does `RestClient` throw on a read timeout? Find it in the app log.
