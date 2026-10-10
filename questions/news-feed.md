---
id: news-feed
title: Design a social media news feed
level: senior
topics: [fan-out, ranking, caching, graph-data]
minutes: 45
---

## Prompt

Design the backend for a social network's news feed: users follow other users, and when they open the app they see a feed of recent posts from people they follow.

## Clarifications

- **Scale?** 200 million daily active users, 500 million posts created per day, average 400 million feed reads per day.
- **Social graph shape?** Average user follows 300 people; a small set of celebrity accounts have over 10 million followers each.
- **Read pattern?** Feed read is the hottest path: peak 60,000 feed-reads/sec, average 12,000/sec.
- **Write pattern?** Peak 8,000 posts/sec, average 3,000/sec.
- **Freshness requirement?** A new post should appear in a follower's feed within 10 seconds under normal load.
- **Ranking?** Feed is reverse-chronological for this interview (explicitly descope ML ranking) but should support inserting a ranking step later.
- **Staleness tolerance?** It is acceptable for a feed to be briefly out of order or missing a post for a few seconds, but a user should never see a post from someone they do not follow.

## Follow-ups

- A celebrity with 10 million followers posts. Walk through what happens and why naive fan-out-on-write breaks here.
- A user follows 300 people and opens a cold feed (nothing precomputed, e.g. right after signup). How do you serve that in under 300ms?
- How do you handle a user unfollowing someone right after that person posted: does the stale post linger in the feed?
- Add the ranking step back in. What does that do to your fan-out and storage design?

## Rubric

- Identifies the core trade-off by name: fan-out-on-write (precompute each follower's feed at post time, fast reads, but a single celebrity post triggers millions of writes) versus fan-out-on-read (assemble the feed at read time by merging followees' posts, cheap writes, but expensive fan-in reads for users who follow many people).
- Proposes a hybrid: fan-out-on-write for regular users, fan-out-on-read (or a hybrid pull) for celebrity accounts, with a followed-count threshold deciding which path a post takes.
- Designs the precomputed feed as a bounded-size list per user (e.g. last 500 post ids) in a fast store (Redis or similar), not an unbounded structure.
- Covers the social graph storage (follower/followee edges) separately from post storage, and how fan-out workers read the follower list to push to feed caches.
- Addresses the 10-second freshness requirement with an async fan-out pipeline (queue plus workers) rather than synchronous writes on the post-creation request path.
- Discusses how ranking could be inserted later as a re-scoring step over a candidate set, without requiring a full redesign of fan-out.
- Mentions handling deletes/unfollows as feed invalidation or lazy filtering at read time.

## Pitfalls

- Proposing pure fan-out-on-write without addressing the celebrity/hot-key problem, or pure fan-out-on-read without addressing read latency for heavy followers.
- Treating the social graph and the feed cache as the same data store with the same access pattern.
- Doing fan-out synchronously inside the post-creation API call, which would make posting latency depend on follower count.
- No mention of how ranking could ever be added, treating reverse-chronological as a permanent architectural constraint.
