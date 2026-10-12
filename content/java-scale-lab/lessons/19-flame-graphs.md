# Lesson 19 · Why is it slow: flame graphs

**Reading time:** 13 min · **Concept:** CPU vs wall-clock profiling, flame graphs, allocation, GC pressure
**Mission:** 19

## The problem

The trace for a slow request shows something unhelpful: one span, `loadProduct`, took 38 ms out
of a 40 ms request, and inside Postgres the actual query only took 4 ms. So where did the other
34 ms go? The trace tells you *which method* was slow. It does not tell you *what that method was
doing* while it burned the time. For that you need a different tool: a profiler.

## Why it is hard

"Slow" has at least three different causes that look identical from the outside: the CPU is busy
computing something, the CPU is idle while waiting for something else (a lock, a disk, another
thread), or the code is creating so much short-lived garbage that the garbage collector keeps
interrupting everything to clean up. Fixing the wrong one wastes a day. You need a tool that shows
*where the time inside one method actually went*, broken down by what the CPU was doing, sample
by sample.

## The idea: stack a day's work into blocks

Forget the profiler for a moment. Imagine timing one request yourself with a stopwatch and a
notebook, writing down every method as you enter it and leave it:

```
enter handleRequest        t=0
  enter validate           t=0
  leave validate           t=2
  enter loadProduct        t=2
    enter queryDb          t=2
    leave queryDb          t=7
    enter computeDiscount  t=7
    leave computeDiscount  t=37
  leave loadProduct        t=37
  enter serialize          t=37
  leave serialize          t=40
leave handleRequest        t=40
```

Now draw it as stacked bars, one bar per method, width proportional to the time between its
enter and leave, stacked by nesting (who called whom):

```
|--------------------------- handleRequest (40ms) ---------------------------|
|-val-|------------------ loadProduct (35ms) -------------------|---serial---|
      |-queryDb (5ms)-|------ computeDiscount (30ms) -----------|
```

That picture is a **flame graph**: every bar is a function on the call stack, the x-axis is time
(or percentage of samples), and a bar's width tells you how much of the total that function and
everything it called were responsible for. A tall, narrow spike is a method that calls deep but
costs little. A short, very wide bar near the bottom is where the time actually lives: here,
`computeDiscount` at 30 out of 40 ms, three quarters of the whole request.

You just built one by hand for a single request. In the lab, Pyroscope builds the same picture
from thousands of real requests per second, by sampling the stack of every running thread many
times a second and counting how often each function showed up. A function that is slow shows up
in more samples, so it gets a wider bar. No stopwatch, no manual notebook, same idea.

### Reading it

- **Width** is the thing that matters. A wide bar at any depth is where the time went, whether
  it is at the top of the stack or buried five calls deep.
- **Height** (depth) just tells you the call chain: who called whom. A tall stack is not
  necessarily a slow one.
- Click into a wide bar and it becomes the new "whole width": you zoom into that part of the
  call tree the same way you would zoom into a photo.

## Why it is hard, part two: what are the samples actually measuring?

Here is the part that trips people up. A profiler can sample two different things, and they tell
different stories about the exact same slow method.

**CPU (on-CPU) profiling** only takes a sample when a thread is actually running on a CPU core.
If `computeDiscount` is doing arithmetic in a tight loop, every sample catches it, and it shows
up as a wide bar: the CPU really is busy computing.

**Wall-clock (off-CPU) profiling** samples a thread regardless of whether it is running or
waiting: blocked on a lock, waiting for a socket read, parked by the thread scheduler. If
`computeDiscount` instead spent those 30 ms waiting on a `synchronized` block held by another
thread, a CPU profile would barely show it at all, because the thread was not using the CPU. A
wall-clock profile would show the same wide bar, but the time would be labeled waiting, not
running.

Same 30 ms, same method, two completely different fixes: a CPU-bound hot spot needs a better
algorithm or less work per request; a lock-wait needs less contention, not a faster loop. Always
check which kind of profile you are looking at before you decide what to optimize. Pyroscope in
the lab can show both; the dashboard panel's title tells you which one you are reading.

## Allocation and GC pressure

There is a third kind of "slow" that neither CPU time nor wait time explains well on its own:
the application spends its CPU time constantly creating small, short-lived objects, and the
JVM's garbage collector has to keep stopping the world (or at least a part of it) to clean them
up. This is called **GC pressure**: not that garbage collection is broken, but that the
application is generating so much garbage, so fast, that collecting it becomes a real cost.

Think of a kitchen where every dish is served on a fresh plate that gets thrown away afterward.
One dish, no problem. A thousand dishes an hour, and now someone has to run to the storeroom for
plates constantly and the trash has to be hauled out every few minutes, work that has nothing to
do with cooking but that steals time from it. An **allocation profile** (also built from samples,
this time of "which line of code just created an object") shows you exactly which method is
generating the garbage: often it is building the same small list or string over and over per
request where a loop could reuse one. The flame graph for allocations looks exactly like the one
for CPU time, except the width means "bytes allocated here" instead of "time spent here".

You will see GC pressure on the dashboard as a sawtooth: heap usage climbs as objects pile up,
then drops sharply when the collector runs, and while it runs, request latency ticks up because
application threads briefly pause. If CPU usage is high but no single method dominates the CPU
flame graph, check the allocation profile and the GC pause metrics next: the CPU may be busy
collecting garbage, not doing your business logic.

## Where you will meet this

- "The database says the query is fast but the endpoint is slow": the time is somewhere in your
  Java code, and a CPU or wall-clock profile is the only thing that will show you where.
- Code review for a hot path: "does this loop allocate a new object per item?" is a fair question
  before the code ever reaches production.
- Comparing two versions of a method after a fix: did the wide bar actually get narrower, or did
  it just move somewhere else in the call tree?

## One sentence summary

> A flame graph turns thousands of stack samples into stacked bars whose width is time (or
> bytes), so the widest bar, not the deepest one, tells you where a request's time actually went,
> and whether that bar is a CPU hot spot, a lock wait, or garbage collection changes the fix.

## Check question

A profiler shows `parseCampaignPrices` as the widest bar in a CPU profile, at 60% of total
request time, while a wall-clock profile of the same endpoint shows `parseCampaignPrices` at only
8%. What does that mismatch tell you about what the method is actually doing, and which profile
would you trust to decide whether to optimize its algorithm?
