import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { beforeAll, beforeEach, describe, expect, it } from "vitest"
import { parseLabLine, tokenize } from "../lib/core/lab-commands"
import {
  currentMission,
  getLesson,
  getMission,
  labAvailable,
  listResults,
  listScenarios,
  readProgress,
  section,
  withoutSections,
} from "../lib/core/lab"
import { markLessonRead, readNotebook, saveLabReview, saveNotebook } from "../lib/core/notebook"
import { makeLab } from "./fixtures/make-lab"

describe("lab command allowlist", () => {
  const scenarios = ["orders", "smoke"]
  it("accepts the commands missions use", () => {
    expect(parseLabLine("./lab load orders 40", scenarios)?.argv).toEqual(["load", "orders", "40"])
    expect(parseLabLine("./lab up", scenarios)?.argv).toEqual(["up"])
    expect(parseLabLine("./lab chaos payment slow", scenarios)?.argv).toEqual(["chaos", "payment", "slow"])
    expect(parseLabLine(`./lab explain "SELECT * FROM orders WHERE dealer_id = 42"`, scenarios)?.argv).toEqual([
      "explain",
      "SELECT * FROM orders WHERE dealer_id = 42",
    ])
    expect(parseLabLine("./lab load orders 40", scenarios)?.heavy).toBe(true)
  })

  it("refuses anything that is not a known lab command", () => {
    for (const line of [
      "rm -rf /",
      "./lab reset",
      "./lab run",
      './lab done 01 "x"',
      "./lab load ../../etc 40",
      "./lab load nope 40",
      "./lab load orders 40; rm -rf ~",
      "./lab load orders $(whoami)",
      "./lab chaos payment explode",
      "./lab sql",
      "./lab up prod",
      "git push",
    ]) {
      expect(parseLabLine(line, scenarios), line).toBeNull()
    }
  })

  it("tokenizes quotes and rejects unbalanced ones", () => {
    expect(tokenize(`./lab sql 'SELECT 1'`)).toEqual(["./lab", "sql", "SELECT 1"])
    expect(tokenize(`./lab sql "SELECT 1`)).toBeNull()
  })
})

describe("lab checkout on disk", () => {
  beforeAll(() => {
    process.env.DACOSPACE_LAB_DIR = makeLab()
  })

  it("reads progress, the current mission and the log", () => {
    expect(labAvailable()).toBe(true)
    const { missions, log } = readProgress()
    expect(missions.map((m) => m.nn)).toEqual(["01", "02", "03"])
    expect(missions[0]).toMatchObject({ status: "done", date: "2026-10-11" })
    expect(missions[1]).toMatchObject({ missionFile: "labs/02-breaking-point.md", lessonFile: "lessons/02-littles-law.md" })
    expect(missions[2].missionFile).toBeNull()
    expect(currentMission(missions)?.nn).toBe("02")
    expect(log).toEqual([{ date: "2026-10-11", nn: "01", text: "the average describes a user who does not exist" }])
  })

  it("parses mission and lesson files with their meta lines", () => {
    const m = getMission("02")!
    expect(m.title).toBe("The breaking point")
    expect(m.meta).toMatchObject({ time: "60-90 min", concept: "Little's Law, connection pool", lesson: "02" })
    expect(m.body.startsWith("## Scenario")).toBe(true)
    expect(getLesson("02")?.meta["reading time"]).toBe("14 min")
    expect(getMission("03")).toBeUndefined()
    expect(getMission("../x")).toBeUndefined()
  })

  it("splits the notebook sections out of the mission body", () => {
    const body = getMission("02")!.body
    expect(section(body, /Evidence/)).toContain("| p95 |")
    expect(section(body, /^Check question/)).toBe("What is the new capacity?")
    const rest = withoutSections(body, /^(\d+\.\s*)?(Evidence|In your own words|Check question)/)
    expect(rest).toContain("## Scenario")
    expect(rest).toContain("## Java corner")
    expect(rest).not.toContain("Evidence")
    expect(rest).not.toContain("Check question")
  })

  it("lists scenarios and k6 results newest first, skipping broken files", () => {
    expect(listScenarios()).toEqual(["orders", "smoke"])
    const results = listResults()
    expect(results).toHaveLength(2)
    expect(results[0]).toMatchObject({ scenario: "orders", targetRps: 80, p95: 7093, dropped: 913 })
    expect(results[0].failedPct).toBeCloseTo(0.05)
    expect(results[1]).toMatchObject({ targetRps: 20, p95: 309.6 })
  })
})

describe("lab notebook", () => {
  beforeEach(() => {
    process.env.DACOSPACE_DATA = fs.mkdtempSync(path.join(os.tmpdir(), "daco-nb-"))
  })

  it("saves notes, marks the lesson read once, refuses a review of an empty notebook", () => {
    expect(readNotebook("02").notes).toBe("")
    expect(() => saveLabReview("02", { verdict: "pass", notes: "x" })).toThrow(/empty notebook/)
    const first = markLessonRead("02").lessonReadAt
    expect(markLessonRead("02").lessonReadAt).toBe(first)
    saveNotebook("02", { notes: "p95 7 s at 80/s", takeaway: "capacity is pool / W" })
    const reviewed = saveLabReview("02", { verdict: "revisit", notes: "Explain W again." })
    expect(reviewed).toMatchObject({ notes: "p95 7 s at 80/s", review: { verdict: "revisit" } })
    expect(() => readNotebook("../../etc")).toThrow(/bad mission/)
  })
})
