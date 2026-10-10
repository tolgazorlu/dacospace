---
id: video-streaming
title: Design a video upload and streaming service
level: senior
topics: [transcoding, cdn, object-storage, adaptive-bitrate]
minutes: 45
---

## Prompt

Users upload videos, and other users watch them on phones, laptops, and TVs
over varying network conditions. Design the system that handles upload,
processing, and playback.

## Clarifications

- **Scale?** 500,000 uploads/day, average raw file size 400 MB, average length 6 minutes.
- **Playback volume?** 50 million video views/day, peak 3,000 playback starts/second during evening hours.
- **Devices and networks?** Mix of mobile on 3G/4G/5G, desktop broadband, and smart TVs on wifi; bandwidth ranges from 500 kbps to 50 mbps.
- **Processing requirement?** Each upload must be transcoded into at least 4 resolution tiers (240p, 480p, 720p, 1080p) before it is watchable.
- **Latency target?** A video should be watchable at the lowest tier within 2 minutes of upload completing, full tier set within 15 minutes.
- **Storage retention?** All original and transcoded files kept indefinitely; total video storage growing by roughly 200 TB/day.
- **Playback start latency?** Time to first frame must be under 1.5 seconds at p95 globally.

## Follow-ups

- A popular creator's video goes viral and gets 2 million views in one hour, far above normal. What in your design absorbs this without the CDN or origin falling over?
- Transcoding for a specific upload gets stuck in a crash loop. How does the user experience degrade, and how do you detect and recover?
- A user in a region with 500 kbps connectivity starts playback. Describe exactly what happens from request to first frame, including bitrate selection.
- How would you reduce the 15-minute full-transcode latency to under 3 minutes without proportionally increasing compute cost?
- Storage is growing 200 TB/day and costs are becoming a board-level concern. What do you propose?

## Rubric

- Separates the upload/ingest path from the transcoding pipeline from the playback/delivery path as distinct, independently scalable stages.
- Names the key trade-off: transcoding more resolution tiers up front improves playback flexibility but increases processing cost and time-to-watchable.
- Describes adaptive bitrate streaming (HLS/DASH) with segment-based delivery so the client can switch quality mid-playback based on measured bandwidth.
- Uses a CDN with edge caching for segment delivery and explains cache-miss behavior falling back to origin or regional cache.
- Covers the transcoding pipeline as an async job queue with per-resolution worker tasks, including retry/backoff on failure.
- Addresses the viral-spike scenario explicitly: CDN absorbs read fanout, origin is shielded, and no single video's popularity should overload a specific transcoding or storage shard.
- Mentions storage tiering (hot vs cold, keeping originals in cheaper cold storage) as a cost lever.

## Pitfalls

- Serving raw uploaded video directly without transcoding or adaptive bitrate, ignoring device/network diversity.
- Having playback read from the same storage/path as live transcoding writes, risking partial reads.
- No mention of CDN caching, implying every view hits origin storage.
- Treating transcoding as a single synchronous step blocking the upload response.
