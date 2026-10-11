import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { beforeEach, describe, expect, it } from "vitest"
import { getDay, pickNext, saveAnswer, streak, today, type Day } from "../lib/core/days"
import { loadQuestions, parseQuestion, type Question } from "../lib/core/questions"

const q = (id: string, level: Question["level"], topics: string[], track: Question["track"] = "systems"): Question => ({
  id, title: id, level, topics, minutes: 45, track, prompt: "", clarifications: [], followUps: [], rubric: [], pitfalls: [],
})

describe("question bank", () => {
  it("every file in questions/ parses and follows the format", () => {
    const bank = loadQuestions()
    expect(bank.length).toBeGreaterThanOrEqual(30)
    for (const item of bank) {
      expect(item.clarifications.length, item.id).toBeGreaterThanOrEqual(4)
      expect(item.followUps.length, item.id).toBeGreaterThanOrEqual(3)
      expect(item.rubric.length, item.id).toBeGreaterThanOrEqual(5)
    }
    expect(new Set(bank.map((x) => x.id)).size).toBe(bank.length)
  })

  it("rejects a file without the required sections", () => {
    expect(() =>
      parseQuestion("---\nid: a-b\ntitle: Design X\nlevel: mid\ntopics: [x]\n---\n## Prompt\nHi\n"),
    ).toThrow(/missing sections/)
  })
})

describe("pickNext", () => {
  const bank = [q("s1", "senior", ["a"]), q("j1", "junior", ["cache"]), q("j2", "junior", ["queue"]), q("m1", "mid", ["cache"])]
  const day = (date: string, questionId: string): Day => ({ date, questionId })

  it("starts with the easiest unseen question", () => {
    expect(pickNext(bank, []).id).toBe("j1")
  })

  it("avoids repeating yesterday's topic and never repeats while unseen ones remain", () => {
    expect(pickNext(bank, [day("2026-10-01", "j2")]).id).toBe("j1")
    expect(pickNext(bank, [day("2026-10-02", "j2"), day("2026-10-01", "j1")]).id).toBe("m1")
  })

  it("recycles the least recently asked once the bank is exhausted", () => {
    const history = [day("2026-10-04", "s1"), day("2026-10-03", "m1"), day("2026-10-02", "j1"), day("2026-10-01", "j2")]
    expect(pickNext(bank, history).id).toBe("j2")
  })
})

describe("days on disk", () => {
  beforeEach(() => {
    process.env.DACOSPACE_DATA = fs.mkdtempSync(path.join(os.tmpdir(), "daco-"))
  })

  it("assigns once per date and counts the streak", () => {
    const now = today()
    const first = getDay(now)
    expect(getDay(now).question.id).toBe(first.question.id)
    expect(streak()).toBe(0)
    saveAnswer(now, "my design")
    expect(streak()).toBe(1)
    expect(() => getDay("2999-01-01")).toThrow(/not arrived/)
    expect(() => getDay("../etc")).toThrow(/bad date/)
  })
})
