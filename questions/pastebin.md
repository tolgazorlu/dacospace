---
id: pastebin
title: Design a Pastebin-like text sharing service
level: junior
topics: [storage, object-storage, caching]
minutes: 45
---

## Prompt

Design a service where a user pastes some text, the system generates a shareable link, and anyone with the link can view the text.

## Clarifications

- **Scale?** 1 million new pastes created per day, 20 reads per paste on average, so about 20 million reads per day.
- **Paste size?** Average paste is 10 KB, max allowed size is 1 MB.
- **Peak traffic?** Writes average 12/sec, peak 50/sec. Reads average 230/sec, peak 1,500/sec.
- **Retention?** Default expiration is 7 days; users can choose "never" or a custom expiry up to 1 year.
- **Access control?** Public link by default (anyone with the URL can view); optional "unlisted" flag just hides it from any future listing feature, no auth required to view.
- **Editing?** Pastes are immutable once created; no edit, only delete by the owner (tracked via a browser cookie token for anonymous users).
- **Syntax highlighting?** Client-side only, out of scope for backend design.

## Follow-ups

- Total stored paste text is growing by about 10 GB/day. How do you store and later purge expired content cheaply?
- One paste gets linked from a popular forum and gets 100,000 reads in an hour. How does the read path hold up?
- How do you enforce the 1 MB size limit and stop someone from scripting millions of large pastes to fill storage?
- A user wants to delete their paste. Walk through what has to happen across storage and cache.

## Rubric

- Separates metadata (id, owner token, created_at, expires_at, size) stored in a database from the paste body, proposing object storage (e.g. S3-like blob store) for the body given sizes up to 1 MB.
- Generates short ids similarly to a URL shortener (random or counter-based) and explains the uniqueness approach.
- Names the key trade-off: storing large text bodies directly in the database (simpler, but bloats the DB and hurts backup/replication) versus blob storage with a database pointer (more moving parts, but scales storage independently of query load).
- Puts a cache (e.g. CDN or Redis) in front of reads since read:write ratio is 20:1, with TTL aligned to paste expiration.
- Describes expiration/cleanup as an async background job (TTL index or scheduled sweep) rather than checking on every read only.
- Addresses abuse prevention: size limits enforced at upload time, and rate limiting per IP or token for paste creation.

## Pitfalls

- Storing full paste bodies as a column in the primary relational database without discussing size/scaling implications.
- Treating "unlisted" as if it were actual access control or encryption; conflating it with authentication.
- No plan for expired content cleanup, leaving storage growing unbounded.
- Forgetting that deletion must also invalidate any cache entry, not just the database row.
