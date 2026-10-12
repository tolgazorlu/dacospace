import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { aiLabAvailable, readAiProgress } from "../lib/core/ai-lab"
import { dayView, hostedDay, rotation } from "../lib/core/days"
import { labAvailable, readProgress } from "../lib/core/lab"
import { readNotebook } from "../lib/core/notebook"
import { completeMission, labEnv, startApp, stopApp } from "../lib/server/lab-env"
import { stopRun, streamLab } from "../lib/server/lab-runner"
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

  it("reads both labs from the snapshot without anyone's progress, notes or AI progress", () => {
    process.env.DACOSPACE_LAB_DIR = makeLab() // marks mission 01 done and logs a sentence
    fs.mkdirSync(path.join(data, "lab"), { recursive: true })
    fs.writeFileSync(path.join(data, "lab", "02.json"), JSON.stringify({ nn: "02", notes: "private" }))
    fs.writeFileSync(path.join(data, "ai-lab.json"), JSON.stringify({ lessons: { "01": { readAt: "x" } } }))
    expect(labAvailable()).toBe(true)
    const { missions, log } = readProgress()
    expect(missions.every((m) => m.status === "todo" && m.date === null)).toBe(true)
    expect(log).toEqual([])
    expect(readNotebook("02").notes).toBe("")
    expect(readAiProgress().lessons).toEqual({})
  })

  it("never spawns or kills anything", async () => {
    expect(() => streamLab(["status"], "./lab status", new AbortController().signal)).toThrow(/read-only/)
    expect(() => stopRun()).toThrow(/read-only/)
    expect(() => stopApp()).toThrow(/read-only/)
    await expect(labEnv()).rejects.toThrow(/read-only/)
    await expect(startApp()).rejects.toThrow(/read-only/)
    await expect(completeMission("01", "x")).rejects.toThrow(/read-only/)
  })

  it("ships the snapshot in content/ for both labs", () => {
    delete process.env.DACOSPACE_LAB_DIR
    delete process.env.DACOSPACE_AI_LAB_DIR
    expect(labAvailable()).toBe(true)
    expect(aiLabAvailable()).toBe(true)
    expect(questionSources().map((s) => s.track)).toEqual(["systems", "ai"])
  })
})
