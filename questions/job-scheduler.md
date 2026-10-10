---
id: job-scheduler
title: Design a distributed job scheduler like cron
level: mid
topics: [distributed-systems, fault-tolerance, leader-election, scheduling]
minutes: 45
---

## Prompt

Teams across a company need to schedule recurring jobs, like "run this
script every 5 minutes" or "run this report at 2am daily", and be confident
each job runs exactly once per scheduled time even if a server dies. Design
this scheduling system.

## Clarifications

- **Scale?** 100,000 registered jobs, schedules ranging from every minute to once a month.
- **Trigger rate?** About 40,000 job triggers/hour at peak, roughly 11/second.
- **Execution duration?** Most jobs run in under 30 seconds, but 2% run for up to 2 hours.
- **Delivery guarantee?** Each scheduled trigger must result in exactly one execution; neither zero nor duplicate runs are acceptable.
- **Worker fleet?** 500 worker nodes that pull and execute jobs; any worker can run any job.
- **Failure tolerance?** If a worker dies mid-execution, the job must be detected as failed and retried within 2 minutes.
- **Misfire policy?** If the scheduler itself is down for 10 minutes, jobs due during that window should run once on recovery, not be silently skipped or run multiple times.

## Follow-ups

- Two scheduler instances both believe they are responsible for triggering the same job at the same minute due to a brief network partition. How do you prevent a duplicate trigger?
- A worker picks up a 2-hour job, executes for 90 minutes, and then crashes. How does the system detect this and avoid re-running from scratch if partial progress matters?
- The scheduler was down for 10 minutes and 400 triggers were missed. Walk through exactly how your recovery logic decides what to run and how many times.
- Scale to 1 million registered jobs with per-second granularity schedules. What part of your design needs to change?
- How would you let a team debug "why didn't my job run at 2am" without giving them access to the whole scheduler's internals?

## Rubric

- Uses leader election or sharded ownership (not multiple schedulers independently triggering the same job) to ensure exactly one node decides when a given job fires.
- Names the key trade-off: exactly-once delivery is expensive to guarantee strictly, so most real systems target at-least-once triggering plus idempotent job execution, and the candidate should state which they are choosing and why.
- Describes a durable schedule store (not in-memory only) so scheduler restarts do not lose track of due or upcoming jobs.
- Covers worker-side failure detection via heartbeats or lease timeouts, with a defined action (retry, alert, or mark failed) within the stated 2-minute window.
- Addresses the misfire/catch-up scenario explicitly: a clear policy (run once on recovery, skip, or run all missed) rather than leaving it ambiguous.
- Separates the scheduling decision (when should job X fire) from job execution (a worker doing the actual work), as independently scalable concerns.
- Mentions idempotency keys or dedup tokens per scheduled trigger so retries or duplicate triggers do not cause duplicate side effects downstream.

## Pitfalls

- Running multiple scheduler instances with no coordination, causing duplicate triggers during normal operation, not just during failures.
- Claiming "exactly once" is trivially achievable without acknowledging the coordination cost, or without falling back to idempotent at-least-once execution.
- No durable persistence of the schedule and trigger history, making recovery after a scheduler crash undefined.
- Ignoring the misfire/catch-up policy entirely, leaving missed-trigger behavior unspecified.
