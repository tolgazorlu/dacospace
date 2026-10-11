"use server"

import { revalidatePath } from "next/cache"
import { markAiLessonRead, saveCaseHypothesis } from "@/lib/core/ai-lab"

export async function aiLessonReadAction(nn: string) {
  if (!/^\d{2}$/.test(nn)) return
  markAiLessonRead(nn)
  revalidatePath("/", "layout")
}

export async function caseHypothesisAction(slug: string, hypothesis: string, reveal: boolean) {
  if (!/^[a-z0-9-]+$/.test(slug)) return { error: "bad case" }
  saveCaseHypothesis(slug, hypothesis.slice(0, 20_000), reveal)
  revalidatePath(`/ai/cases/${slug}`)
  return { ok: true }
}
