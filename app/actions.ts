"use server"

import { revalidatePath } from "next/cache"
import { saveAnswer } from "@/lib/core/days"
import { assertLocal } from "@/lib/server/guard"

export async function saveAnswerAction(date: string, answer: string) {
  assertLocal()
  const text = answer.trim()
  if (!text) return { error: "Write something before saving." }
  saveAnswer(date, text)
  revalidatePath("/", "layout")
  return { ok: true }
}
