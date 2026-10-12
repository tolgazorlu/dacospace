import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { parseQuestion } from "../lib/core/questions"

// Turkish translations live in questions/tr/<id>.md. The English file stays the source of truth:
// the translation must keep its id, level, minutes and topics, and translate every bullet one to one.
const root = path.resolve(__dirname, "..")
const trDir = path.join(root, "questions", "tr")
const enDirs = [path.join(root, "questions"), path.join(root, "content", "ai-systems-lab", "questions")]

const english = (id: string) => {
  for (const dir of enDirs) {
    const f = path.join(dir, `${id}.md`)
    if (fs.existsSync(f)) return parseQuestion(fs.readFileSync(f, "utf8"))
  }
  return undefined
}

describe("Turkish questions", () => {
  const files = fs.existsSync(trDir) ? fs.readdirSync(trDir).filter((f) => f.endsWith(".md")) : []

  it.each(files)("%s mirrors its English original", (file) => {
    const tr = parseQuestion(fs.readFileSync(path.join(trDir, file), "utf8"))
    expect(`${tr.id}.md`).toBe(file)
    const en = english(tr.id)
    expect(en, `no English question ${tr.id}`).toBeDefined()
    expect({ level: tr.level, minutes: tr.minutes, topics: tr.topics }).toEqual({ level: en!.level, minutes: en!.minutes, topics: en!.topics })
    for (const key of ["clarifications", "followUps", "rubric", "pitfalls"] as const) {
      expect(tr[key].length, `${tr.id} ${key}`).toBe(en![key].length)
    }
    expect(tr.title).not.toBe(en!.title)
    expect(tr.prompt).not.toBe(en!.prompt)
  })
})
