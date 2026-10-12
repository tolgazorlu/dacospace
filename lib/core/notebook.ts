import fs from "node:fs"
import path from "node:path"
import { z } from "zod"
import { isHosted } from "./hosted"
import { dataDir } from "./paths"

export const LAB_VERDICTS = ["revisit", "pass"] as const

const LabReview = z.object({ verdict: z.enum(LAB_VERDICTS), notes: z.string(), at: z.string() })

const Notebook = z.object({
  nn: z.string().regex(/^\d{2}$/),
  lessonReadAt: z.string().optional(),
  notes: z.string().default(""),
  checkAnswer: z.string().default(""),
  takeaway: z.string().default(""),
  updatedAt: z.string().optional(),
  review: LabReview.optional(),
})

export type Notebook = z.infer<typeof Notebook>
export type LabReview = z.infer<typeof LabReview>

const dir = () => path.join(dataDir(), "lab")
const file = (nn: string) => {
  if (!/^\d{2}$/.test(nn)) throw new Error(`bad mission number ${nn}`)
  return path.join(dir(), `${nn}.json`)
}

export function readNotebook(nn: string): Notebook {
  const f = file(nn)
  if (isHosted()) return Notebook.parse({ nn })
  return fs.existsSync(f) ? Notebook.parse(JSON.parse(fs.readFileSync(f, "utf8"))) : Notebook.parse({ nn })
}

function write(nb: Notebook) {
  fs.mkdirSync(dir(), { recursive: true })
  fs.writeFileSync(file(nb.nn), JSON.stringify(nb, null, 2) + "\n")
  return nb
}

export function saveNotebook(nn: string, patch: Partial<Pick<Notebook, "notes" | "checkAnswer" | "takeaway">>): Notebook {
  return write({ ...readNotebook(nn), ...patch, updatedAt: new Date().toISOString() })
}

export function markLessonRead(nn: string): Notebook {
  const nb = readNotebook(nn)
  return nb.lessonReadAt ? nb : write({ ...nb, lessonReadAt: new Date().toISOString() })
}

export function saveLabReview(nn: string, review: Omit<LabReview, "at">): Notebook {
  const nb = readNotebook(nn)
  if (!nb.notes.trim() && !nb.takeaway.trim() && !nb.checkAnswer.trim()) {
    throw new Error(`mission ${nn} has an empty notebook: nothing to review yet`)
  }
  return write({ ...nb, review: LabReview.parse({ ...review, at: new Date().toISOString() }) })
}
