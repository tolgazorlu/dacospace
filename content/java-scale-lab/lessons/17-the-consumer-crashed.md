# Lesson 17 · The runner who lost their place

**Reading time:** 10 min · **Concept:** at-least-once delivery, consumer offsets, idempotent consumer, dead letter queue
**Mission:** 17

## The problem

Something is now reading "order created" events from Kafka and crediting the dealer's loyalty
points for each order. It works for weeks. Then one day a dealer calls: their points for one
order were added twice. Nobody touched the code. What changed is that the process reading the
events crashed and restarted in the middle of its work, and Kafka's safety net did exactly what
it is designed to do, which turned out not to be "exactly once".

## Why it is hard

"Read a message, do the work, mark it done" sounds like three steps that either all happen or
none do. They are not atomic together. A crash between "did the work" and "marked it done" is
not rare, it is a Tuesday. The messaging system has to pick a side when that happens: either it
risks never delivering the message again, or it risks delivering it twice. Kafka, like most
systems built for reliability, picks delivering it twice over losing it.

## The idea: a runner reading tickets off a spike

Picture a kitchen where the counter clips new order slips onto a spike, in order, as they come
in. A runner stands at the spike, works through it top to bottom, bakes each order, and only
after it is fully baked, writes down on a notepad "I have finished up through ticket #482".
That number on the notepad is a **consumer offset**: a bookmark saying how far through the
ordered stream you have confirmed you are done, per spike you are reading from (in Kafka terms,
per partition).

### Why the bookmark can lie just a little

Now suppose the runner finishes baking ticket #483, but collapses from exhaustion before writing
the new bookmark number down. The notepad still says #482. A second runner takes over, looks at
the notepad, and starts from #483, exactly the one that was already baked. The bread for #483
now gets made twice.

This is not a bug in the notepad system, it is the honest tradeoff of **at-least-once delivery**:
every message is guaranteed to be delivered and processed at least once, but under a crash at
the wrong moment, it may be processed more than once. The alternative, writing the bookmark down
*before* baking, risks the opposite failure: the runner collapses before baking #483 at all, the
notepad already says #483 is done, and that order is silently never baked. Kafka's consumers, by
default, work the way the lab's runner does: finish the work, then move the bookmark, because
losing an order silently is worse than baking one twice.

### Making "baked twice" harmless: the idempotent consumer

If duplicates are possible, the fix is not to chase a system that never duplicates, it is to make
duplicates harmless. Give every order slip a number that never repeats, and before baking, check
a list of numbers already baked today. Order #483 shows up twice; the second time, the runner
sees it on the "already done" list and sets it aside instead of baking a second loaf.

That is an **idempotent consumer**: a message reader that recognizes a message it has already
processed, usually by checking the event's unique id against a record of ids it has handled, and
skips the side effect the second time instead of redoing it. This is the same idea as the
idempotency key from lesson 10, applied on the reading side of an event stream instead of the
client side of an HTTP request. For the loyalty points example, that means storing which order
ids have already been credited, not just trusting that each event arrives exactly once.

### When a ticket simply will not bake

Some orders are not duplicates, they are broken: a malformed event, a dealer id that no longer
exists, a bug that throws every time that one message is processed. If the runner just keeps
retrying the same stuck ticket, the whole spike behind it never gets touched; one bad order
jams the entire kitchen. The usual answer is a **dead letter queue**: after a message fails
processing some number of times in a row, say 3, it is moved out of the normal stream into a
separate "set this aside" queue, so processing can continue past it, and a person looks at the
dead letter queue later to decide what to do with the stuck one.

### Putting the three ideas together

| Runner analogy | Kafka / consumer term |
|---|---|
| spike of order slips, in order | a topic partition |
| the notepad bookmark | consumer offset |
| checking the "already baked" list | idempotent consumer |
| setting a jammed ticket aside after 3 tries | dead letter queue |

None of these four is optional once you accept at-least-once delivery. The offset tells you
roughly where you are; the idempotency check is what actually protects the dealer's loyalty
points from being credited twice; the dead letter queue stops one bad message from blocking
every message behind it.

## Where you will meet this

- Any consumer of events, webhooks, or queued jobs: "it ran twice" is the default possibility to
  design for, not a bug to be surprised by.
- Billing and loyalty systems specifically, where a duplicate side effect is a customer-visible,
  sometimes money-visible, mistake.
- On-call debugging: a growing dead letter queue is a clear signal that is cheap to alert on,
  long before customers notice anything.

## One sentence summary

> Delivery is at least once, so a consumer must make the second copy of a message harmless and set aside the one it cannot process.

## Check question

A consumer processes messages, then commits its offset in a separate step afterward, same as
the lab's runner. It crashes right after fully processing message #57 but before committing the
offset, then restarts. Message #57 is read again. If the consumer has no idempotency check at
all, what is the risk, and which of the four ideas in this lesson would remove it without
requiring the message itself to change?
