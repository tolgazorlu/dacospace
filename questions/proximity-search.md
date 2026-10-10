---
id: proximity-search
title: Design a nearby places search like Yelp
level: mid
topics: [geospatial, indexing, caching, search-ranking]
minutes: 45
---

## Prompt

Users should be able to open the app and see restaurants and shops near
their current location, sorted by distance and rating. Design the backend
for that search.

## Clarifications

- **Data size?** 20 million businesses worldwide with a location and a
  category, concentrated in cities.
- **Query volume?** 10k searches/second at peak, each search for "nearby"
  within a radius of 1 to 10 km chosen by the user.
- **Latency target?** Results returned in under 200ms at p95.
- **Result shape?** Return up to 50 ranked results per query: distance,
  rating, category, open-now status.
- **Update rate?** Business data (new listings, hours, closures) changes
  about 500k times/day; location rarely changes once a business is created.
- **Ranking?** Primary sort is a blend of distance and rating, exact
  formula is flexible, but it must use both.
- **Consistency requirement?** A business marked closed should disappear
  from results within 5 minutes, exact real-time consistency is not required.

## Follow-ups

- A dense area like Manhattan has 50,000 businesses within a 2km radius,
  how do you keep the query fast there specifically versus a rural search?
- Query volume spikes 5x during a local event in one city, how does the
  system handle a hot region without degrading other regions?
- How do you add a new filter, like "open now" or "price range," without
  re-architecting the index?
- The business location data has some bad GPS coordinates on ingestion, how
  does a bad coordinate affect nearby searches, and how would you catch it?
- How would the design differ if the result needed to update in real time as
  the user walks and their location changes, like a map that reflows?

## Rubric

- Chooses a geospatial indexing structure (geohash, quadtree, or an
  R-tree-backed store) over naive distance computation across all 20M rows.
- Names the core trade-off: geohash-style grid indexing is simple and plays
  well with standard key-value or search infra but has uneven cell density
  in cities, versus a quadtree/R-tree that adapts to density but adds
  implementation and update complexity.
- Explains how the radius query maps to index lookups (e.g. covering cells
  at an appropriate geohash precision for the requested radius).
- Addresses hot regions (dense cities) explicitly, such as finer-grained
  partitioning or additional replicas for high-density cells.
- Covers how ranking blends distance and rating, and where that scoring
  happens (at query time vs precomputed).
- Discusses update propagation for business data changes within the 5-minute
  freshness bound, separate from the read-path index.
- Mentions caching for popular/stable queries (same city, same category) to
  cut load on the geospatial index.

## Pitfalls

- Doing a full table scan with a distance formula instead of using a
  geospatial index.
- Ignoring uneven data density between a dense city and a rural area.
- Treating ranking as pure distance sort, ignoring the stated rating blend.
- No plan for keeping "closed" or stale businesses out of results.
