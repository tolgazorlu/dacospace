import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { aiLabAvailable } from "../lib/core/ai-lab"
import { dayView, hostedDay, rotation } from "../lib/core/days"
import { labAvailable } from "../lib/core/lab"
import { LEVELS, loadQuestions, questionSources } from "../lib/core/questions"
import { makeLab } from "./fixtures/make-lab"

describe("hosted mode", () => {
  let data: string
  beforeEach(() => {
    data = fs.mkdtempSync(path.join(os.tmpdir(), "daco-hosted-"))
    process.env.DACOSPACE_DATA = data
    process.env.DACOSPACE_HOSTED = "1"
  })
  afterEach(() => {
    delete process.env.DACOSPACE_HOSTED
  })

  it("walks the whole bank once, junior to senior", () => {
    const bank = loadQuestions("systems")
    const order = rotation(bank)
    expect(new Set(order.map((q) => q.id)).size).toBe(bank.length)
    const levels = order.map((q) => LEVELS.indexOf(q.level))
    expect(levels).toEqual([...levels].sort((a, b) => a - b))
  })

  it("gives every visitor the same question for a date and writes nothing", () => {
    expect(dayView("2026-10-12").question.id).toBe(hostedDay("2026-10-12").question.id)
    expect(hostedDay("2026-10-12").question.id).not.toBe(hostedDay("2026-10-13").question.id)
    expect(fs.readdirSync(data)).toEqual([])
    expect(() => hostedDay("../etc")).toThrow(/bad date/)
  })

  it("turns both labs off even when checkouts exist next to it", () => {
    process.env.DACOSPACE_LAB_DIR = makeLab()
    process.env.DACOSPACE_AI_LAB_DIR = process.env.DACOSPACE_LAB_DIR
    fs.mkdirSync(path.join(process.env.DACOSPACE_AI_LAB_DIR, "questions"), { recursive: true })
    expect(labAvailable()).toBe(false)
    expect(aiLabAvailable()).toBe(false)
    expect(questionSources().map((s) => s.track)).toEqual(["systems"])
    delete process.env.DACOSPACE_HOSTED
    expect(labAvailable()).toBe(true)
    expect(questionSources().map((s) => s.track)).toEqual(["systems", "ai"])
  })
})
