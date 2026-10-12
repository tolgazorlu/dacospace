# Lesson 01 · Why the average lies

**Reading time:** 10 min · **Concept:** RED metrics, percentiles (p50, p95, p99)
**Mission:** 01

## The problem

You open a dashboard. It says: average response time 60 ms, error rate 0%. Green everywhere.
That same morning, three dealers call support: "the app froze when I tried to open the price
list". You look at the dashboard again. Still green.

Both are true. The dashboard is not broken and the dealers are not lying. The dashboard is
answering the wrong question.

## Why it is hard

"How fast is my service?" sounds like one question with one number. It is not. A service
answers thousands of requests and every one of them has its own duration. Squeezing all of
them into one number throws away exactly the part users complain about: the slow ones.

## The idea, with 10 requests

Forget millions of requests. You are standing at a counter and you serve 10 dealers. You write
down how long each one waited, in ms:

```
12  10  11  9  13  10  12  11  10  2000
```

Nine of them were served almost instantly. One waited two full seconds.

**You** compute the average: (12+10+11+9+13+10+12+11+10+2000) / 10 = **209.8 ms**.

Look at that number. Nobody waited 209.8 ms. Nine people waited about 11 ms and one person
waited 2,000 ms. The average describes a dealer who does not exist.

Now do it differently. **Sort** the list:

```
9  10  10  10  11  11  12  12  13  2000
```

- The value in the middle (the 5th of 10) is 11. That is the **p50**, the median: "half of the
  requests were faster than this".
- The value at 90% of the way (the 9th of 10) is 13. That is **p90**: "90% were faster than this".
- The last one, 2,000, is the worst case here. With 100 requests, the 99th value would be your **p99**.

A percentile is just "sort them, then point at a position". Nothing more.

### Why we care about p95 and p99, not p50

Ask yourself: how many requests does one dealer send in a day? They open the price list,
filter by category, open a few products, check their orders. Say 50 requests per day.

If 1% of requests are slow (that is what a bad p99 means), then a dealer with 50 requests has a
very good chance of hitting at least one slow request every single day. The math:
the chance of *never* hitting a slow one is 0.99^50 ≈ 0.61. So about **4 out of 10 dealers
hit a slow request every day.**

So p99 is not "a rare user". With enough requests per user, the tail becomes everyone's daily
experience. This is why serious teams put p95 or p99 on their alerts, not the average.

## RED: three numbers per endpoint

The dashboard you will use is built around **RED**, the three things a user feels:

| Letter | Meaning | Question it answers |
|---|---|---|
| **R**ate | requests per second | how busy are we? |
| **E**rrors | failed requests per second (or %) | are people getting failures? |
| **D**uration | p50, p95, p99 of response time | how long do people wait? |

Every endpoint gets its own RED. "The service is slow" becomes "`POST /api/orders` has a p95
of 3 s at 60 requests per second, `GET /api/products` is fine". That sentence points at code.

There is a second family called **USE** (Utilization, Saturation, Errors). RED looks at the
service from the user's side. USE looks at a resource from the inside: CPU, a connection pool,
a thread pool. In the lab dashboard, the "Saturation" row is USE. You will need it in lesson 02.

## How percentiles are measured (just enough)

Your Spring app does not keep every duration in memory. It keeps a **histogram**: a row of
buckets like "under 5 ms", "under 10 ms", "under 25 ms" ... and counts how many requests fell
into each bucket. Prometheus scrapes those counters every 5 seconds. Grafana's
`histogram_quantile(0.95, ...)` walks the buckets to find where 95% of the requests are.

Two consequences you will notice in the lab:

1. Percentiles are **estimates** inside a bucket, so p95 might say 23.7 ms when the true value
   was 22 ms. Fine for decisions, not for 3 decimal places.
2. You **cannot average percentiles**. If instance A has p95 = 100 ms and instance B has
   p95 = 300 ms, the total p95 is not 200 ms. You must add up the buckets first and then compute.
   The dashboard queries do this with `sum by (le)`.

## Traces: the "why" behind one slow request

Percentiles tell you *that* some requests are slow. A **trace** tells you *why one of them* was
slow. It is the timeline of a single request: 2 ms in the controller, 1,800 ms waiting for a
database connection, 15 ms running the SQL, 3 ms writing JSON. Each piece is called a **span**.

In the lab, every request is traced and stored in Tempo. When p99 jumps, you open the slowest
trace and read where the time went. Metrics find the problem, traces explain it.

## Where you will meet this

- Every incident review: "average looked fine" is the most common sentence before someone
  looks at p99.
- Every SLO: "99% of checkout requests under 800 ms" is a percentile target.
- Every load test in this lab: you will compare p95 before and after each fix.

## One sentence summary

> The average describes a user who does not exist; p95 and p99 describe the users who complain,
> and with enough requests per user, that is everyone.

## Check question

You serve 10 requests: `8 9 9 10 10 11 11 12 900 950`.
Without a calculator: is the average closer to p50 or to p99? Which number would you put on an
alert, and why?
