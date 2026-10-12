# Progress

`./lab today` opens the first `todo` row. `./lab done NN "one sentence"` closes it and appends
your sentence to the log below. dacospace (http://localhost:4120/lab) reads and writes this file
too. Missions not written yet arrive with `git pull`.

| # | Mission | Concept | Status | Date |
|---|---|---|---|---|
| 01 | Open your eyes: a dashboard tour | RED, p50/p95/p99, why the average lies | todo | - |
| 02 | 09:00 rush: the breaking point | Little's Law, connection pool, saturation | todo | - |
| 03 | The dealer's order history | EXPLAIN, seq scan, index, Flyway migration | todo | - |
| 04 | One request, many queries | N+1, Hibernate lazy loading, batch fetching | todo | - |
| 05 | Slow payments slow down everything | transaction boundary, pool exhaustion | todo | - |
| 06 | The last 10 items | race condition, lost update, atomic UPDATE, optimistic lock | todo | - |
| 07 | The provider stops answering | timeouts (connect/read), fail fast | todo | - |
| 08 | Retry, but wisely | retry, exponential backoff, jitter (Resilience4j) | todo | - |
| 09 | Open the circuit | circuit breaker, bulkhead, fallback | todo | - |
| 10 | The same order twice | idempotency key, unique constraint | todo | - |
| 11 | Price list cache | Redis, cache-aside, TTL | todo | - |
| 12 | Cache expired, everyone rushed the DB | thundering herd, request coalescing | todo | - |
| 13 | One dealer slows down everyone | rate limiting, token bucket, noisy neighbor | todo | - |
| 14 | 3 instances + a load balancer | stateless service, horizontal scaling, nginx | todo | - |
| 15 | Virtual threads | Java 21+ Loom, thread-per-request, pinning | todo | - |
| 16 | Don't lose the order event | dual write, outbox pattern, Kafka | todo | - |
| 17 | The consumer crashed | at-least-once, consumer idempotency, DLQ | todo | - |
| 18 | SLOs and alerts | SLI/SLO, error budget, burn rate alert | todo | - |
| 19 | Why is it slow: flame graphs | profiling (Pyroscope), allocation, GC | todo | - |
| 20 | Reads go to a replica | read replica, replication lag, read-your-writes | todo | - |
| 21 | 400k → 40M orders | partitioning, archiving, vacuum | todo | - |
| 22 | Chaos day | killing instances, DB restart, graceful shutdown | todo | - |
| 23 | Capacity report | capacity planning, bottleneck chain | todo | - |
