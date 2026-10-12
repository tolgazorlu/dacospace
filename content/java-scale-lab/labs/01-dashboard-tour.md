# Mission 01 · Open your eyes: a dashboard tour

**Time:** 45-60 min · **Concept:** RED metrics, p50/p95/p99, why the average lies
**Lesson:** 01 · **Curriculum link:** system design 2.7 Observability

## Scenario

You run a dealer ordering system. 2,000 dealers, 20,000 products, 400k orders from last year.
Dealers open the price list in the morning, place orders during the day, and now and then look
at their "my recent orders" screen. Nothing has been optimized yet.

Today you change no code. You only learn to **see**. The next 22 missions all work the same
way: "look at this graph, did this number move?" If you cannot read the graph, none of them work.

## Setup

```bash
./lab up
./lab seed
```

`./lab seed` is needed only once (about 15 s). Start the app from the environment bar, or run
`./lab run` in a separate terminal.

Grafana: http://localhost:4182 → Dashboards → Scale Lab → **Scale Lab**

## 1. Predict first (write it down)

Before running the test, write down:

1. At 100 requests per second, what is the p95 of the price list endpoint in ms?
2. How many times larger is p99 than the average?

A wrong guess is fine. Measuring without guessing makes you read the result as "yes, as
expected". The guess forces you to read the measurement carefully.

## 2. Measure

```bash
./lab load morning-rush 100
```

The test runs for 100 s. Watch these four panels while it runs:

| Panel | What it tells you |
|---|---|
| Rate | Requests per second. Does it reach 100? |
| Errors | 4xx/5xx. Should be empty right now. |
| Duration p50/p95/p99 + average | The real lesson is here |
| DB connection pool | `active`, `idle`, `pending` |

## 3. Explore

1. Compare the "average (lies)" line with p99 on the dashboard. How far apart are they?
2. Grafana → Explore → **Tempo** → Search → open the slowest trace.
   Look at the spans: where did most of the time go? Controller or SQL?
3. Run this query in Prometheus (http://localhost:4183) and explain in your own words what it returns:
   ```
   rate(http_server_requests_seconds_count{uri="/api/products"}[1m])
   ```
4. Run the slow query report. Which query spent the most total time?

```bash
./lab topsql
```

## 4. Evidence

Fill this table in your notebook:

| | My guess | Measured |
|---|---|---|
| p95 (price list) | | |
| average | | |
| p99 | | |
| where the slowest trace spent its time | | |

## 5. In your own words (the mission is not done without it)

One sentence: how would you explain the gap between the average and p99 to a dealer?

## Check question

The dashboard shows p50 = 20 ms and p99 = 2,000 ms. A colleague says "the average is 45 ms,
we're fine". Which single number do you show them, and why?

## Java corner

Open `ProductController.java`. Find these three things and explain them to yourself:
- What does `@RestController` do?
- Which part of the URL does `@RequestParam String category` take?
- What does `.stream().map(ProductView::from).toList()` produce?

Write any unknown term into your java-dev-journal.
