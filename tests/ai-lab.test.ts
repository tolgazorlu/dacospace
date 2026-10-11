import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

const root = fs.mkdtempSync(path.join(os.tmpdir(), "daco-ai-"))
const ai = path.join(root, "ai-systems-lab")
const data = path.join(root, "data")

const write = (rel: string, body: string) => {
  fs.mkdirSync(path.dirname(path.join(ai, rel)), { recursive: true })
  fs.writeFileSync(path.join(ai, rel), body)
}

beforeAll(() => {
  process.env.DACOSPACE_AI_LAB_DIR = ai
  process.env.DACOSPACE_DATA = data
  write(
    "PROGRESS.md",
    "| # | Lesson | Concepts | Module | Done |\n|---|---|---|---|---|\n| 01 | First | a, b | Foundations | |\n| 02 | Second | c | Agents | |\n",
  )
  write(
    "lessons/01-first.md",
    "# Lesson 01 · First\n\n**Reading time:** 15 min · **Module:** Foundations · **Concepts:** a, b\n**Cases:** some-case\n\n## The problem\n\nText.\n",
  )
  write(
    "cases/some-case.md",
    "# Case · Something broke (2025)\n\n**Category:** Security · **Lessons:** 01, 08 · **Severity:** data leak\n\n## The system\n\nA bot.\n\n## Stop and think\n\n1. Why?\n\n## What actually happened\n\nThe secret.\n\n## Sources\n\n- x\n",
  )
  write(
    "questions/ai-sample.md",
    "---\nid: ai-sample\ntitle: Design an agent\nlevel: senior\ntopics: [ai, agents]\nminutes: 45\n---\n\n## Prompt\n\nGo.\n\n## Clarifications\n\n- **A?** B.\n\n## Follow-ups\n\n- C\n\n## Rubric\n\n- D\n\n## Pitfalls\n\n- E\n",
  )
})

afterAll(() => {
  delete process.env.DACOSPACE_AI_LAB_DIR
  delete process.env.DACOSPACE_DATA
  fs.rmSync(root, { recursive: true, force: true })
})

describe("ai lab", () => {
  it("reads the roadmap, lessons and their meta", async () => {
    const lab = await import("../lib/core/ai-lab")
    const rows = lab.readAiRoadmap()
    expect(rows.map((r) => [r.nn, r.title, r.module, Boolean(r.file)])).toEqual([
      ["01", "First", "Foundations", true],
      ["02", "Second", "Agents", false],
    ])
    const lesson = lab.getAiLesson("01")!
    expect(lesson.meta.cases).toBe("some-case")
    expect(lab.getAiLesson("../x")).toBeUndefined()
  })

  it("splits a case before and after Stop and think, so the autopsy stays hidden", async () => {
    const lab = await import("../lib/core/ai-lab")
    const c = lab.getCase("some-case")!
    expect(c.title).toBe("Something broke (2025)")
    expect(c.lessons).toEqual(["01", "08"])
    expect(c.before).toContain("1. Why?")
    expect(c.before).not.toContain("The secret")
    expect(c.after.startsWith("## What actually happened")).toBe(true)
    expect(lab.getCase("../../etc/passwd")).toBeUndefined()
  })

  it("tracks read lessons and case hypotheses, and moves to the next lesson", async () => {
    const lab = await import("../lib/core/ai-lab")
    expect(lab.nextAiLesson()?.nn).toBe("01")
    lab.markAiLessonRead("01")
    lab.saveCaseHypothesis("some-case", "the bot leaked", false)
    expect(lab.readAiProgress().cases["some-case"].revealedAt).toBeUndefined()
    lab.saveCaseHypothesis("some-case", "the bot leaked via images", true)
    const p = lab.readAiProgress()
    expect(p.lessons["01"]).toBeDefined()
    expect(p.cases["some-case"]).toMatchObject({ hypothesis: "the bot leaked via images" })
    expect(p.cases["some-case"].revealedAt).toBeDefined()
  })

  it("merges AI questions into the bank with their track, and alternates tracks day to day", async () => {
    const { loadQuestions, getQuestion } = await import("../lib/core/questions")
    const { pickNext } = await import("../lib/core/days")
    const bank = loadQuestions()
    expect(getQuestion("ai-sample")?.track).toBe("ai")
    expect(loadQuestions("ai").map((q) => q.id)).toEqual(["ai-sample"])
    const systems = bank.find((q) => q.track === "systems")!
    const next = pickNext(bank, [{ date: "2026-01-01", questionId: systems.id }])
    expect(next.track).toBe("ai")
  })
})
