"use server"

import { revalidatePath } from "next/cache"
import { saveAnswer } from "@/lib/core/days"
import { assertLocal } from "@/lib/server/guard"
import { getT } from "@/lib/i18n/server"

export async function saveAnswerAction(date: string, answer: string) {
  assertLocal()
  const text = answer.trim()
  if (!text) return { error: (await getT()).session.empty }
  saveAnswer(date, text)
  revalidatePath("/", "layout")
  return { ok: true }
}
