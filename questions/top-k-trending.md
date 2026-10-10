---
id: top-k-trending
title: Design a top-K trending hashtags system
level: mid
topics: [streaming, count-min-sketch, top-k, sliding-window]
minutes: 45
---

## Prompt

A social media platform wants to show the top 10 trending hashtags updated
continuously, based on recent activity. Design the system that computes and
serves that list.

## Clarifications

- **Scale?** 50,000 posts/second platform-wide, roughly 15% contain at least
  one hashtag, average 1.3 hashtags per tagged post.
- **Trending window?** "Trending" means volume over the last 15 minutes,
  sliding, not all-time counts.
- **Cardinality?** Around 2 million distinct hashtags in use over a given
  day, but activity is heavily skewed, the top 1,000 account for most volume.
- **Freshness?** The displayed top 10 should reflect activity from at most 1
  minute ago.
- **Read pattern?** Every app home screen shows the same global top 10 list,
  read volume is roughly 2 million reads/minute, far higher than write
  volume.
- **Precision requirement?** Approximate counts are acceptable for the long
  tail, but the top 10 ranking itself must be accurate, no hashtag that
  isn't truly in the top 10 should display as if it were.

## Follow-ups

- A hashtag count needs to "age out" as it leaves the 15-minute window, walk
  through how a count that was high 14 minutes ago gets removed from the
  trending total without rescanning all posts in the window.
- A single hashtag spikes from a celebrity post, going from 0 to 500,000
  mentions in 2 minutes, does the system handle that gracefully or does it
  skew everything else?
- How would you support regional trending (top 10 per country) instead of
  one global list, given the read volume is already high for a single list?
- An approximate counting structure undercounts a hashtag that's borderline
  top 10, how do you catch that it's producing a wrong ranking versus just
  an imprecise count?
- Read volume grows to 20 million reads/minute, how do you serve that
  without recomputing the ranking on every read?

## Rubric

- Separates the write path (counting hashtag occurrences per sliding window)
  from the read path (serving the precomputed top 10), since reads vastly
  outnumber writes here.
- Names the core trade-off: exact counting (e.g. a hash map per time bucket)
  is simple and precise but memory-heavy across 2M distinct hashtags, versus
  an approximate structure like count-min sketch that bounds memory but
  introduces estimation error, which must be handled carefully for the
  top-10 accuracy requirement.
- Describes a sliding window implementation using fixed time buckets (e.g.
  1-minute buckets, keep the last 15, sum them), so aging out old data is a
  bucket drop, not a full rescan.
- Explains how the top 10 is maintained incrementally (e.g. a bounded heap
  or periodic re-sort over the top few hundred candidates) rather than
  sorting all 2M hashtags on every update.
- Addresses serving the precomputed list from a cache or in-memory store to
  support the stated 2M reads/minute without hammering the aggregation
  system.
- Covers how a single viral spike is absorbed without starving aggregation
  resources needed for everything else.
- Discusses how approximate counting for the long tail is reconciled with
  the requirement that the top 10 itself be exact or near-exact, such as
  tracking exact counts only for current high-volume candidates.

## Pitfalls

- Recomputing the full ranking over all posts in the window on every read.
- Using a purely approximate structure everywhere without acknowledging it
  can misorder the top 10, violating the accuracy requirement.
- No concrete mechanism for aging out old data from the sliding window.
- Ignoring the read/write asymmetry and serving reads straight from the
  aggregation system instead of a cached snapshot.
