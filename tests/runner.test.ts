import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { currentRun, streamLab } from "@/lib/server/lab-runner"

describe("streamLab", () => {
  it("keeps the command running and does not throw when the tab goes away", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "daco-run-"))
    fs.writeFileSync(path.join(dir, "lab"), "#!/bin/sh\necho start\nsleep 0.3\necho end\n", { mode: 0o755 })
    process.env.DACOSPACE_LAB_DIR = dir
    const ac = new AbortController()
    const res = streamLab(["status"], "./lab status", ac.signal)
    const reader = res.body!.getReader()
    await reader.read()
    ac.abort()
    await reader.cancel()
    await new Promise((r) => setTimeout(r, 600))
    expect(currentRun()).toBeNull()
  })
})
