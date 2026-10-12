# Lesson 08 · Retry, but wisely

**Reading time:** 11 min · **Concept:** transient vs permanent errors, exponential backoff, jitter, retry amplification, retry budget, idempotent retries
**Mission:** 08

## The problem

You add timeouts (lesson 07), so calls to the payment provider now fail fast instead of hanging.
Good. Your first instinct is to retry every failure immediately, because surely the second attempt
will go through. Sometimes it does. When the provider is genuinely struggling, retrying
immediately, from every dealer, on every failed call, does something much worse than nothing: it
adds more load onto a provider that was already failing because it had too much load.

## Why it is hard

A retry looks purely defensive, a safety net with no downside: if the first try worked, the retry
never fires, so what is the harm in having it? The harm shows up only under the exact condition
that made you want retries in the first place: when the provider is already struggling. That is
precisely when a flood of simultaneous retries does the most damage, which is the opposite of when
you reasoned about the feature.

## The idea: knocking on a door that will open eventually

### Not every failure deserves a retry

First, decide what actually failed. A **transient error** is one that is likely to succeed if you
simply try again a bit later: a network blip, a brief 503, a timeout caused by a momentary spike.
A **permanent error** will fail exactly the same way every time you retry it: a 400 because the
request itself is malformed, a 401 because the credentials are wrong, a card that was declined for
insufficient funds. Retrying a permanent error wastes time, wastes a thread, and teaches the
dealer nothing except that the app is slow to tell them "no". Only retry the first kind.

### Exponential backoff: wait longer each time, not the same amount

Picture knocking on a door. Nobody answers. Does it make sense to knock again immediately, at the
same speed, forever? No: if nobody is home right now, knocking a second later rarely changes that.
It makes more sense to wait a bit, then a bit longer, then longer still, giving whatever was
overloaded time to actually recover. **Exponential backoff** doubles (or otherwise multiplies) the
wait between attempts: try, wait 200 ms, try, wait 400 ms, try, wait 800 ms, and so on, instead of
retrying every 200 ms regardless of how many times you have already failed.

### Jitter: don't let everyone knock at the same moment

Now picture a hundred dealers whose payment calls all failed at the same instant, because the
provider had one bad second. With plain exponential backoff, all hundred wait exactly 200 ms and
then all retry at exactly the same moment, as one spike. That single synchronized spike can be
just as bad as the original overload. **Jitter** means adding a small random amount to each wait,
so instead of a hundred clients retrying at exactly 200 ms, they spread out across, say, 150 to
250 ms. A smeared-out wave of retries is far gentler on a recovering system than one sharp spike.

### Retry amplification: the multiplication you did not notice

Say a dealer's phone app retries a failed request up to 3 times. Say your order service, in turn,
retries its own call to the payment provider up to 3 times for each attempt. One dealer tap can now
turn into `3 x 3 = 9` actual calls reaching the payment provider. If the provider was failing
because it had too much load, you just sent it nine times the traffic for that one tap, from that
one dealer alone. This compounding effect, where retries at each layer of a call chain multiply
together, is **retry amplification**, and it is the single most common way a "resilience" feature
turns a brief blip into a full outage.

### Retry budget: a ceiling on how much retrying is allowed

A **retry budget** caps the extra load retries are allowed to add, for example "retries may not
exceed 10% of normal traffic in any given minute". Once the budget is spent, further failures are
returned to the caller immediately instead of retried, which sounds harsh but protects the
provider from exactly the compounding effect above. Without a budget, "retry up to 3 times" has no
upper bound on total extra load when failures are widespread rather than isolated.

### Only retry what is safe to repeat

Before any of the above matters, ask one more question: if this call actually reached the provider
and charged the card, but the response was lost on the way back (say the connection dropped after
the charge succeeded), is retrying safe? Charging a card a second time for the same order is not a
timing inconvenience, it is a real double charge. An operation is **idempotent** when running it
twice has the same effect as running it once; only idempotent operations are safe to retry blindly.
A plain "charge this card for this order" call, with nothing distinguishing attempt one from
attempt two, is not safe to retry as written. Making it safe needs a way for the provider to
recognize "I already processed this exact request", which is a problem for a later lesson; for now,
the rule to carry forward is: before you add a retry, check whether retrying twice is actually
equivalent to doing it once.

## Where you will meet this

- Any HTTP client wrapped with `@Retryable`: the annotation is easy to add, the judgment about
  which errors, how many attempts, and what backoff is where the real work is.
- Incident reviews after an outage got worse, not better, once retries kicked in: almost always a
  mix of no backoff, no jitter, and no budget, all three missing at once.
- Any call chain more than one hop deep: ask what each hop's retry policy multiplies into at the
  far end.

## One sentence summary

> Retries only help a transient failure, and only when they back off, spread out with jitter, stay
> under a budget, and are applied to an operation that is safe to run twice; otherwise they turn a
> struggling provider into a drowning one.

## Check question

A mobile app retries a failed request up to 2 times, and the backend service it calls retries its
own downstream payment call up to 4 times per attempt. If the payment provider is currently
rejecting every call due to overload, how many actual calls can one single tap on the mobile app
generate against that provider? Would adding backoff and jitter change that total number of calls?
