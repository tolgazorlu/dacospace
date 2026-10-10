---
id: file-sync
title: Design a file synchronization service like Dropbox
level: senior
topics: [sync-protocol, conflict-resolution, chunking, offline-first]
minutes: 45
---

## Prompt

Users install a client on multiple devices and expect any file they edit on
one device to appear on all others within seconds, even after being
offline. Design the sync backend and client protocol.

## Clarifications

- **Scale?** 20 million users, average 3 devices each, average 2,000 files per user, average file size 4 MB.
- **Change rate?** 50 million file-change events/day across all users, peak 2,000 changes/second.
- **File size range?** Most files under 10 MB, but up to 5% are large files (video, archives) up to 2 GB.
- **Offline tolerance?** A device can be offline up to 30 days and must reconcile correctly on reconnect.
- **Sync latency target?** A small file edit should propagate to other online devices within 5 seconds.
- **Conflict scenario?** Same file edited on two devices while both are offline from each other; both reconnect within the same hour.
- **Bandwidth constraint?** Client should not re-upload unchanged portions of a large file after a small edit.

## Follow-ups

- Two devices edit the same file offline, then both come back online 10 minutes apart. Walk through conflict detection and resolution.
- A user edits a 1.5 GB video file by trimming 2 seconds off the end. How much data gets re-uploaded and re-downloaded with your design?
- A device has been offline for 30 days and the user made 500 changes locally while the account also received 300 changes from other devices. Describe the reconciliation process.
- Scale to 100 million users. What part of the metadata or chunk-indexing layer becomes the bottleneck first?
- How do you handle a user who deletes a shared folder while another collaborator is mid-edit on a file inside it?

## Rubric

- Splits files into content-defined chunks and syncs only changed chunks, not whole files, explaining the bandwidth and storage dedup benefit.
- Names the key trade-off: chunk size affects dedup granularity and upload efficiency versus metadata overhead (more chunks means more index entries).
- Proposes a versioned, per-file change log (or operation log) per user/device so reconciliation after long offline periods is a replay, not a guess.
- Describes a concrete conflict-resolution policy (e.g. last-writer-wins with conflicted-copy fallback, or vector clocks/CRDTs) and justifies the choice for this product.
- Separates metadata service (file tree, versions, permissions) from chunk/blob storage (content-addressed object store).
- Covers the notification/propagation path: how other online devices learn a change happened within the 5-second target (push notification plus delta fetch, not polling the whole tree).
- Addresses large-file handling distinctly from small-file handling given the stated bandwidth constraint.

## Pitfalls

- Treating sync as whole-file upload/download, ignoring chunking and bandwidth cost for large files.
- Assuming conflicts are rare and only hand-waving "last write wins" without discussing data loss risk.
- No explicit mechanism for a long-offline client to reconcile; implying it just re-downloads everything.
- Conflating the metadata/index layer with the blob storage layer as one undifferentiated database.
