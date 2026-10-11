import fs from "node:fs"
import os from "node:os"
import path from "node:path"

/** A minimal java-scale-lab checkout on disk, in the formats the real repo uses. */
export function makeLab(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "daco-lab-"))
  const put = (rel: string, body: string) => {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true })
    fs.writeFileSync(path.join(dir, rel), body)
  }
  put("lab", "#!/bin/sh\necho \"lab $*\"\n")
  fs.chmodSync(path.join(dir, "lab"), 0o755)
  put(
    "PROGRESS.md",
    `# Progress

| # | Mission | Concept | Status | Date |
|---|---|---|---|---|
| 01 | Open your eyes | RED, percentiles | done | 2026-10-11 |
| 02 | The breaking point | Little's Law | todo | - |
| 03 | Order history | index | todo | - |

## Log

- 2026-10-11 [01] the average describes a user who does not exist
`,
  )
  put(
    "labs/02-breaking-point.md",
    `# Mission 02 · The breaking point

**Time:** 60-90 min · **Concept:** Little's Law, connection pool
**Lesson:** 02 · **Curriculum link:** system design 0.2

## Scenario

Campaign day.

## 2. Measure

\`\`\`bash
./lab load orders 40
./lab load orders 80
\`\`\`

## 4. Evidence

| | 20/s | 80/s |
|---|---|---|
| p95 | | |

## 5. In your own words

One sentence.

## Check question

What is the new capacity?

## Java corner

Read the code.
`,
  )
  put("lessons/02-littles-law.md", "# Lesson 02 · Ten checkouts and a queue\n\n**Reading time:** 14 min · **Concept:** Little's Law\n**Mission:** 02\n\n## The problem\n\nA queue.\n")
  put("load/lib.js", "")
  put("load/orders.js", "")
  put("load/smoke.js", "")
  put(
    "results/2026-10-11_123000_orders_20rps.json",
    JSON.stringify({ metrics: { http_reqs: { count: 1200, rate: 20 }, http_req_failed: { value: 0 }, http_req_duration: { med: 163, "p(95)": 309.6, max: 564 } } }),
  )
  put(
    "results/2026-10-11_124000_orders_80rps.json",
    JSON.stringify({ metrics: { http_reqs: { count: 3888, rate: 57.4 }, http_req_failed: { value: 0.0005 }, http_req_duration: { med: 5247, "p(95)": 7093, max: 10230 }, dropped_iterations: { count: 913 } } }),
  )
  put("results/2026-10-11_125000_orders.json", "{ broken")
  return dir
}
