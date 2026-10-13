import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { parseCase } from "../lib/core/ai-lab"
import { parseDoc, section } from "../lib/core/lab"

// Turkish translations of the lab content live in content/tr/<repo>/<same path>. The English file is the
// source of truth; a translation must keep everything a parser, a Run button or a reader relies on.
const root = path.resolve(__dirname, "..")
const trRoot = path.join(root, "content", "tr")

const walk = (dir: string): string[] =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith(".md") ? [path.join(dir, e.name)] : []))
    : []

const lines = (s: string) => s.replace(/\r\n/g, "\n").split("\n")
const fences = (s: string) => [...s.matchAll(/^```[^\n]*\n[\s\S]*?^```/gm)].map((m) => m[0])
const prose = (s: string) => s.replace(/^```[^\n]*\n[\s\S]*?^```/gm, "")
const headingLevels = (s: string) => lines(prose(s)).filter((l) => /^#{1,6} /.test(l)).map((l) => l.match(/^#+/)![0].length)
const tableRows = (s: string) => lines(prose(s)).filter((l) => l.trimStart().startsWith("|")).map((l) => l.split("|").length)
const urls = (s: string) => [...s.matchAll(/https?:\/\/[^\s)>\]"'`]+/g)].map((m) => m[0].replace(/[.,;:]+$/, "")).sort()
const inlineCode = (s: string) => [...prose(s).matchAll(/`[^`\n]+`/g)].map((m) => m[0]).sort()
const numbers = (s: string) =>
  [...prose(s).replace(/`[^`\n]+`/g, "").replace(/https?:\/\/\S+/g, "").matchAll(/\d[\d.,]*\d|\d/g)].map((m) => m[0].replace(/[.,]/g, "")).sort()

/** The title line prefix and the metadata block right under it, which the parsers read. */
function head(s: string) {
  const ls = lines(s)
  const i = ls.findIndex((l) => l.startsWith("# "))
  const prefix = ls[i].match(/^#\s+((?:Mission|Lesson)\s+\d{2}\s*·|Case\s*·)/)?.[1] ?? null
  let j = i + 1
  while (j < ls.length && !ls[j].trim()) j++
  const meta: string[] = []
  // Case severity is a sentence shown to readers, so it is translated; every other key and value stays.
  for (; j < ls.length && /^\*\*[^*]+:\*\*/.test(ls[j]); j++) meta.push(ls[j].replace(/(\*\*Severity:\*\* ).*$/, "$1…"))
  return { prefix, meta }
}

const SECTION_PAIRS: [RegExp, RegExp][] = [
  [/^## Stop and think/m, /^## Dur ve düşün/m],
  [/^## (\d+\.\s*)?Evidence/m, /^## (\d+\.\s*)?Kanıt/m],
  [/^## (\d+\.\s*)?In your own words/m, /^## (\d+\.\s*)?Kendi cümlelerinle/m],
  [/^## (\d+\.\s*)?Check question/m, /^## (\d+\.\s*)?Kontrol sorusu/m],
]

describe("Turkish lab content", () => {
  const files = walk(trRoot).map((f) => path.relative(trRoot, f))

  it.each(files)("%s mirrors its English original", (rel) => {
    const enFile = path.join(root, "content", rel)
    expect(fs.existsSync(enFile), `no English original for ${rel}`).toBe(true)
    const en = fs.readFileSync(enFile, "utf8")
    const tr = fs.readFileSync(path.join(trRoot, rel), "utf8")

    expect(tr).not.toBe(en)
    expect(head(tr), "title prefix and metadata block stay as in English").toEqual(head(en))
    expect(fences(tr), "code blocks are byte-identical").toEqual(fences(en))
    expect(headingLevels(tr), "same headings, same levels, same order").toEqual(headingLevels(en))
    expect(tableRows(tr), "same table rows and columns").toEqual(tableRows(en))
    expect(urls(tr), "same links").toEqual(urls(en))
    expect(inlineCode(tr), "inline code unchanged").toEqual(inlineCode(en))
    expect(numbers(tr), "every number kept").toEqual(numbers(en))
    for (const [enRe, trRe] of SECTION_PAIRS) expect(trRe.test(tr), `section ${enRe} uses its fixed Turkish name`).toBe(enRe.test(en))
    expect(prose(tr).includes("—"), "no em dashes in prose").toBe(false)
    // What the app pulls out of the file must be found in the translation too.
    if (rel.includes("/cases/")) {
      const [c, e] = [parseCase("x", tr), parseCase("x", en)]
      expect(Boolean(c.after), "case reveal split").toBe(Boolean(e.after))
    } else {
      const kind = rel.includes("/labs/") ? "mission" : "lesson"
      const [d, e] = [parseDoc(tr, kind), parseDoc(en, kind)]
      expect(d.meta).toEqual(e.meta)
      expect(Boolean(section(d.body, /Evidence|Kanıt/i)), "evidence section").toBe(Boolean(section(e.body, /Evidence/i)))
      expect(Boolean(section(d.body, /^(Check question|Kontrol sorusu)/i)), "check question").toBe(Boolean(section(e.body, /^Check question/i)))
    }
  })
})
