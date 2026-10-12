import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { makeLab } from "./fixtures/make-lab"

function makeAiLab(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "daco-ai-"))
  const put = (rel: string, body: string) => {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true })
    fs.writeFileSync(path.join(dir, rel), body)
  }
  put("PROGRESS.md", "| # | Lesson | Concepts | Module |\n|---|---|---|---|\n| 01 | One | a | Foundations |\n")
  put("lessons/01-one.md", "# Lesson 01 · One\n\nBody\n")
  put("cases/some-case.md", "# Case · Some case\n")
  put("questions/ai-q.md", "---\nid: ai-q\n---\n")
  put("docs/private-notes.md", "not for publishing")
  put("lessons/notes.txt", "not markdown in the allowlist")
  return dir
}

const sync = (lab: string, ai: string, out: string) =>
  execFileSync("node", ["scripts/sync-content.mjs", lab, ai], { env: { ...process.env, DACOSPACE_CONTENT_OUT: out }, stdio: "pipe" })

describe("sync-content", () => {
  it("copies only the allowlisted reading material and drops the progress log", () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), "daco-content-"))
    const lab = makeLab()
    const ai = makeAiLab()
    sync(lab, ai, out)
    const progress = fs.readFileSync(path.join(out, "java-scale-lab", "PROGRESS.md"), "utf8")
    expect(progress).toContain("| 01 | Open your eyes | RED, percentiles | todo | - |")
    expect(progress).not.toMatch(/done|Log|the average describes/)
    expect(fs.existsSync(path.join(out, "java-scale-lab", "lab"))).toBe(false)
    expect(fs.readdirSync(path.join(out, "ai-systems-lab")).sort()).toEqual(["PROGRESS.md", "cases", "lessons", "questions"])
    expect(fs.readdirSync(path.join(out, "ai-systems-lab", "lessons"))).toEqual(["01-one.md"])
  })

  it("refuses to publish a file that contains a machine path or a key", () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), "daco-content-"))
    const lab = makeLab()
    const ai = makeAiLab()
    fs.writeFileSync(path.join(ai, "cases", "leaky.md"), "see /Users/someone/secrets.txt")
    expect(() => sync(lab, ai, out)).toThrow(/refusing to publish/)
  })
})
