import { describe, expect, it } from "vitest"
import { getQuestion, localize } from "../lib/core/questions"
import { messages, pickLang } from "../lib/i18n/messages"

describe("language", () => {
  it("follows the cookie, then a Turkish browser, else English", () => {
    expect(pickLang("en", "tr-TR,tr;q=0.9")).toBe("en")
    expect(pickLang("tr", "en-US")).toBe("tr")
    expect(pickLang(undefined, "tr-TR,tr;q=0.9,en;q=0.8")).toBe("tr")
    expect(pickLang(undefined, "en-US,en;q=0.9,tr;q=0.5")).toBe("en")
    expect(pickLang("de", null)).toBe("en")
  })

  it("shows content reading times in Turkish units", () => {
    expect(messages("tr").common.duration("10-15 min")).toBe("10-15 dk")
    expect(messages("en").common.duration("10-15 min")).toBe("10-15 min")
  })
})

describe("localize", () => {
  const q = getQuestion("rate-limiter")!

  it("swaps in the Turkish text and keeps the English metadata", () => {
    const tr = localize(q, "tr")
    expect(tr.title).toBe("Public bir API için rate limiter tasarla")
    expect({ id: tr.id, level: tr.level, minutes: tr.minutes, topics: tr.topics, track: tr.track }).toEqual({
      id: q.id, level: q.level, minutes: q.minutes, topics: q.topics, track: q.track,
    })
    expect(tr.clarifications).toHaveLength(q.clarifications.length)
  })

  it("leaves English alone and falls back when no translation exists", () => {
    expect(localize(q, "en")).toBe(q)
    const made = { ...q, id: "no-such-translation" }
    expect(localize(made, "tr")).toBe(made)
  })
})

describe("localized lab content", () => {
  it("reads content/tr when it exists and falls back to English", async () => {
    const fs = await import("node:fs")
    const path = await import("node:path")
    const { localizedFile } = await import("../lib/core/paths")
    const base = path.resolve(__dirname, "..", "content", "java-scale-lab")
    const rel = "lessons/01-why-the-average-lies.md"
    expect(localizedFile("java-scale-lab", base, rel, "en")).toBe(path.join(base, rel))
    const tr = localizedFile("java-scale-lab", base, rel, "tr")
    expect(tr).toBe(fs.existsSync(path.resolve(__dirname, "..", "content", "tr", "java-scale-lab", rel)) ? path.resolve(__dirname, "..", "content", "tr", "java-scale-lab", rel) : path.join(base, rel))
    expect(localizedFile("java-scale-lab", base, "lessons/99-none.md", "tr")).toBe(path.join(base, "lessons/99-none.md"))
  })
})
