# Lesson 22 · Chaos day

**Reading time:** 12 min · **Concept:** failure injection, graceful shutdown, readiness vs liveness, blast radius
**Mission:** 22

## The problem

You have 3 app instances behind nginx, a cache, a replica, and a payment provider that WireMock
can make slow, hang, return 503, or drop connections on command. Every one of those pieces has
failed in isolation in earlier lessons, and you fixed each one. Nobody has yet asked what happens
when a failure hits while the system is under real load and nobody is watching a dashboard for
it, the way failures actually arrive in production: at the worst time, without an announcement.
**Chaos day** is the day you break things on purpose, while you are watching, so you learn the
answer before production asks the question for you.

## Why it is hard

Every fix so far was tested one at a time, with the rest of the system healthy. Real incidents
rarely give you that courtesy. An instance can crash at the exact moment the payment provider is
also slow. A deploy can roll out a new version while traffic is at its daily peak. The question
chaos day asks is not "did I fix the bug", it is "when something breaks anyway, who notices, how
much do they lose, and does the rest of the system keep working or drag itself down too". You
cannot answer that by reading the code. You have to actually break it and watch.

## The idea: a fire drill, not a fire

A fire drill does not wait for an actual fire. You schedule it, you know it is coming, and you
watch exactly what happens: does everyone leave through the right doors, does the alarm reach the
back office, does anyone get left behind in the break room. **Failure injection** is the same
idea applied to your system: you deliberately cause a failure you control, at a time you choose,
and you watch the dashboards, traces, and logs to see what actually happens, instead of guessing.
In the lab this means things like killing one of your 3 app instances mid-load-test, or telling
WireMock to make every payment call hang for 30 seconds starting now.

### Blast radius

When you kill one of 3 instances, how much of your traffic is affected? Nginx should notice
within seconds and stop sending new requests there, so roughly a third of requests feel a brief
hiccup while the other two take over, and none feel anything after that. That "how much of the
system is affected by one failure" is the failure's **blast radius**. A well-built system keeps
blast radius small and proportional: lose one of three instances, lose roughly a third of spare
capacity, not all of it. A badly built one turns a small failure into a big one: if all 3
instances share one thing that cannot tolerate the load alone, say a single database connection
pool sized for calm traffic, losing one instance can push the other two past their own limits
and take the whole service down. The blast radius of "one instance died" should never be "every
request fails", and chaos day is where you find out whether that is actually true or just
something you assumed.

### Graceful shutdown

Killing an instance abruptly, mid-request, is not how a normal deploy or scale-down should work,
and it is worth testing both ways. A **graceful shutdown** means an instance that is told to stop
first refuses new work, finishes the requests it already started, and only then actually exits.
Two things have to happen in the right order: nginx has to stop sending *new* requests to that
instance (this is called draining), and the instance itself has to wait for its *in-flight*
requests to finish before shutting down the thread pool and the database connections under them.
Get the order wrong, shut the connection pool first, and in-flight requests fail even though
nothing was actually broken; they were just cut off mid-sentence.

### Readiness vs liveness

Nginx and any orchestrator watching your instances need a quick, automatic answer to two
different questions, and conflating them causes real outages:

- **Liveness**: "is this process alive, or stuck and should it be restarted?" A deadlocked
  instance that never responds to anything should fail this and get killed and replaced.
- **Readiness**: "is this instance currently able to handle a new request well, right now?" An
  instance that is alive but, say, still warming up its connection pool, or deliberately draining
  before shutdown, should fail this one while still passing liveness: it is not broken, it is
  just not the one you should send work to this second.

Mixing the two up is a common and costly mistake: if "readiness" and "liveness" are the same
check, an instance that is merely busy or draining looks indistinguishable from one that is
actually dead, and gets restarted for no reason, right when it was already doing useful work or
politely finishing it.

## Running the drill

A chaos day exercise has a shape, not just a button to press: pick one failure (kill an instance,
make the payment provider hang, drop the replica's connection), announce what you are about to do
and when, inject it while a load test runs, and watch the RED metrics and traces the whole time,
not just at the end. Afterward, write down what actually happened, not what you expected: did the
circuit breaker from lesson 09 open, did the retry budget from lesson 08 hold, did nginx's health
check notice the dead instance in 2 seconds or 20. Each answer either confirms a lesson you
already learned or shows you a gap nobody tested in isolation.

## Where you will meet this

- "We deploy during business hours" is only safe if graceful shutdown and readiness checks are
  both correct; chaos day is where you prove it before a real deploy does.
- Postmortems that end with "we didn't know it would cascade like that": blast radius thinking,
  done before the incident, is how you find the cascade on a Tuesday afternoon instead of a
  Saturday night.
- Any on-call rotation: the first real incident should not be the first time anyone has seen
  these dashboards move.

## One sentence summary

> Chaos day breaks one thing on purpose, while you are watching, so you measure the real blast
> radius of a failure, the real behavior of graceful shutdown, and the real difference between
> "alive" and "ready" before production forces the same lesson on you unannounced.

## Check question

During a chaos day drill you kill 1 of your 3 app instances while load-testing at 80% of the
3-instance capacity. If the readiness check correctly removes the dead instance from nginx within
2 seconds, roughly what load are the remaining 2 instances carrying right after that, as a
percentage of their own combined capacity? Would you expect them to hold, and what would change
your answer?
