---
id: collaborative-editor
title: Design a collaborative document editor like Google Docs
level: senior
topics: [crdt, operational-transform, real-time-sync, conflict-resolution]
minutes: 45
---

## Prompt

We want multiple people to edit the same text document at the same time and
see each other's changes live, similar to Google Docs. Design the system
that keeps everyone's view consistent.

## Clarifications

- **Scale?** 200k documents actively edited concurrently at peak, average 3
  concurrent editors per active document, up to 50 editors on a handful of
  very large shared documents.
- **Document size?** Typical document 5,000 words, largest supported
  documents around 200,000 words.
- **Latency expectation?** A keystroke should appear on other editors'
  screens within 200ms on a good connection.
- **Conflict scenario?** Two users type in the same paragraph at the same
  time, both edits must survive and the final text must be identical on
  every client.
- **Offline support?** A user can keep typing while briefly offline (up to 2
  minutes) and their edits must merge in when they reconnect.
- **Persistence?** Every document is durably saved, with a version history a
  user can scroll back through, snapshots kept at least every 5 minutes of
  active editing.
- **Client platforms?** Web and desktop app, both need the same consistency
  guarantees.

## Follow-ups

- Two users edit offline for a full minute, both insert text at the same
  cursor position, walk through what the merged document looks like and why.
- A document grows to 200,000 words with 50 concurrent editors, what part of
  the current design slows down first?
- How do you implement "undo" for one user without undoing changes made by
  someone else in the meantime?
- A client reconnects after being offline for 10 minutes, during which the
  document changed heavily, how much data does it need to resync and how do
  you avoid resending the whole document?
- How would you add presence (cursors, selections, who's online) without
  that traffic competing with the actual edit stream?

## Rubric

- Chooses and justifies a conflict resolution approach, CRDT or operational
  transform, rather than a naive last-write-wins on a document field.
- Names the core trade-off: CRDTs give simpler convergence guarantees and
  better offline support but carry more metadata overhead per character,
  versus OT which is more compact but requires a central transform server
  and trickier offline handling.
- Describes how edits are represented (character-level or token-level
  operations) and how they are broadcast to other connected clients.
- Explains the reconnect/resync path: a client sends its last known state or
  version vector, server sends only the delta, not the full document.
- Covers persistence and version history as a separate concern from the
  real-time sync log, with periodic snapshots to bound replay time.
- Addresses presence/cursor data as an ephemeral, separate channel from
  durable edit operations.
- Discusses how undo is scoped to a single user's operations in a
  multi-editor history.

## Pitfalls

- Reaching for last-write-wins or simple locking, which breaks true
  concurrent editing.
- No distinction between ephemeral presence data and durable edit history.
- Ignoring offline editing and merge entirely.
- Assuming the whole document is resent on every reconnect or every edit.
