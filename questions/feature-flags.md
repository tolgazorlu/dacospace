---
id: feature-flags
title: Design a feature flag service
level: junior
topics: [feature-flags, caching, configuration]
minutes: 45
---

## Prompt

Engineering teams want to turn features on or off for specific users without
deploying new code. Design a feature flag service that application servers
can check before deciding whether a feature is enabled.

## Clarifications

- **Scale?** 300 feature flags active across the company, checked by
  application servers about 50,000 times/second total.
- **Latency requirement?** A flag check must not add more than 1ms to a
  request, it sits on the hot path of every page load.
- **Targeting rules?** A flag can be on for everyone, off for everyone, or
  on for a percentage of users (e.g. 10% rollout) or a specific list of user
  ids.
- **Update propagation?** When an engineer flips a flag in the admin UI, it
  should take effect for new requests within 30 seconds.
- **Reliability requirement?** If the flag service is completely unreachable,
  application servers must still be able to evaluate flags using the last
  known configuration, not fail the request.
- **Who manages flags?** About 150 engineers across 20 teams, through a
  shared internal admin UI.

## Follow-ups

- The flag service's database goes down for 10 minutes, what happens to
  flag checks on every running application server during that window?
- Traffic grows 10x to 500,000 checks/second, where does the 1ms budget come
  under pressure first?
- How would you support a flag that's on for "10% of users" in a way that
  keeps the same 10% of users on the feature across multiple checks, rather
  than flipping randomly each request?
- An engineer flips a flag off because a feature is misbehaving in
  production, how fast does that actually take effect, end to end, and why?
- How would you extend this to support gradual rollout by percentage that
  increases automatically over a week, like 1% to 100%?

## Rubric

- Pushes flag evaluation to run locally in-process on the application
  server using a cached/replicated config, rather than a network call to a
  central service on every check, to meet the 1ms budget.
- Names the core trade-off: local caching with periodic sync keeps checks
  fast and resilient to the flag service being down, at the cost of up to
  the sync interval (here 30 seconds) of staleness across servers.
- Describes how config updates propagate from the admin UI to application
  servers, such as polling or a pub/sub push plus a local cache.
- Explains percentage rollout using a deterministic hash of a stable user
  identifier so the same users stay in or out of the rollout across checks.
- States the fallback behavior explicitly: last-known-good config is used
  when the central service is unreachable, flags do not default to a hard
  failure.
- Covers how flag definitions and targeting rules are stored and versioned
  so a rollback to a previous state is possible.
- Mentions basic access control: which engineers or teams can change which
  flags.

## Pitfalls

- Calling a central service synchronously on every flag check, blowing the
  1ms latency budget.
- No fallback plan if the flag service is unreachable, causing checks to
  fail the whole request.
- Percentage rollout implemented as pure randomness per request instead of a
  stable per-user hash, causing users to flicker between variants.
- Treating flag updates as instantaneous everywhere, ignoring realistic
  propagation delay.
