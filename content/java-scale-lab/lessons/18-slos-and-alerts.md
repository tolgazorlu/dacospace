# Lesson 18 · A budget for being wrong

**Reading time:** 11 min · **Concept:** SLI, SLO, error budget, burn rate alerts
**Mission:** 18

## The problem

Your on-call phone buzzes at 3 a.m.: "CPU on instance 2 is at 85%". You check the dashboard.
Dealers are placing orders fine, p95 is normal, nobody has noticed anything. You go back to
sleep, annoyed. A week later the payment provider gets slow for twenty minutes during business
hours, checkout errors spike, dozens of dealers are affected, and nobody got paged, because
nothing was watching for that. The alert fired for the wrong thing and stayed silent for the
right one.

## Why it is hard

There are hundreds of numbers you could alert on: CPU, memory, queue depth, thread count, disk
space. Picking which ones matter, and at what threshold, feels arbitrary, so teams either alert
on everything (and get woken up for nothing) or alert on nothing specific (and miss real
incidents). What is missing is a starting question: not "what number looks scary", but
"what does the dealer actually need from us, and how much room do we have before we fail that".

## The idea: a target, and a budget for missing it

### Pick the number the dealer feels: the SLI

Start from what a dealer actually experiences. For checkout, that might be: "the request to
place an order succeeds, and comes back in under 800 ms". Measuring that, as a percentage of
requests that meet it, is a **Service Level Indicator (SLI)**: a specific, measured number that
reflects whether users are getting good service, built from exactly the RED metrics (error rate,
duration) you already met in lesson 01. CPU is not an SLI for checkout. CPU being high might be
*causing* a problem, but a dealer has never once complained that your CPU was at 85%. They
complain when checkout fails or is slow. That is the whole reason not to alert on CPU directly:
it is a resource signal, useful for diagnosis, not a user-facing signal.

### Decide how good is good enough: the SLO

A **Service Level Objective (SLO)** is a target for an SLI over a time window: "99.9% of
checkout requests succeed within 800 ms, measured over 30 days". Notice it is not 100%. No
realistic system promises 100%; the payment provider itself will occasionally be slow, a network
blip will occasionally happen. Picking 99.9% instead of 100% is a deliberate decision: it is a
promise you can actually keep, and it is honest about the fact that perfection is not on offer.

### The budget hiding inside the SLO

If the target is 99.9% over 30 days, the gap, 0.1%, is not waste, it is your **error budget**:
the amount of "being wrong" you are allowed to spend before you have broken your promise to
dealers. Put it in minutes. Thirty days is 43,200 minutes. 0.1% of that is:

```
43,200 minutes × 0.001 = 43.2 minutes
```

So, over a 30-day window, you can be fully down (or past 800 ms, however you defined the SLI)
for about 43 minutes total and still have kept your promise. A looser target of 99% over the
same 30 days gives you 432 minutes, ten times as much room, because you promised ten times less.
Nothing about this changes if you pick a shorter window: 99.5% over 7 days gives a budget of
about 50 minutes for that week alone. The budget is only meaningful next to the specific target
and window it came from.

An error budget reframes the whole conversation. "Should we ship this risky change" becomes "how
much of this month's 43 minutes have we already spent, and can we afford to spend more". A team
with budget left can take a calculated risk. A team that has already spent the whole month's
budget on the 10th day should stop shipping risky changes and go fix reliability instead,
because the promise is already in danger regardless of what caused it.

### Alerting on the rate of spending, not the spending itself

Here is the part that actually gets you paged correctly at 3 a.m. You do not want to wait until
the whole month's budget is gone to find out, that is too late to act on. You also do not want
to page on every single failed request, that is too noisy. The answer is a **burn rate alert**:
page when the budget is being consumed much faster than the steady rate that would exhaust it
exactly on schedule.

Work it out with the 99.9% example: 43.2 minutes of budget spread evenly over 720 hours (30
days) is an average burn of 0.06 minutes of budget per hour. If, in one bad hour, checkout is
actually down enough to burn 10 times that rate, about 0.6 minutes of budget in that single hour,
that is still a small slice of the total 43.2-minute budget, but it is a strong signal that
*something is actively wrong right now*, which is exactly the moment a page is useful. Waiting
until the slow, steady trickle has eaten the whole 43 minutes would mean noticing only after the
month is already a write-off.

So the three thresholds you actually want are not "CPU above 80%" or "error rate above 0":
they are built from the SLI, the SLO's budget, and how fast that budget is currently burning.

## Where you will meet this

- On-call rotations: a well-run one pages on SLO burn rate for user-facing endpoints, and keeps
  resource metrics like CPU as dashboards to check during an investigation, not pages on their own.
- Postmortems: "we were within budget but the burn rate alert still fired" is a legitimate,
  useful finding, it means you caught a real problem early.
- Negotiating with product: "we have 12 minutes of error budget left this month" is a concrete,
  shared number to decide whether a risky launch goes ahead.

## One sentence summary

> Alert on how fast you are spending an agreed error budget for what users feel, not on how busy a machine looks.

## Check question

Your SLO is 99.5% of orders succeed, measured over 7 days. A single incident eats 20 minutes of
your error budget. Roughly what fraction of the week's total budget did that one incident spend,
and would you still have room left for a routine deployment risk later that week?
