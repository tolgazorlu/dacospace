"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { readProgress } from "@/lib/core/lab"
import { markLessonRead, saveNotebook } from "@/lib/core/notebook"
import { completeMission } from "@/lib/server/lab-env"

const NN = /^\d{2}$/

export async function saveNotebookAction(nn: string, fields: { notes: string; checkAnswer: string; takeaway: string }) {
  if (!NN.test(nn)) return { error: "bad mission number" }
  saveNotebook(nn, { notes: fields.notes, checkAnswer: fields.checkAnswer, takeaway: fields.takeaway.trim() })
  revalidatePath(`/lab/${nn}`)
  return { ok: true }
}

export async function lessonReadAction(nn: string) {
  if (!NN.test(nn)) return
  markLessonRead(nn)
  revalidatePath("/", "layout")
  redirect(`/lab/${nn}`)
}

export async function completeMissionAction(nn: string, fields: { notes: string; checkAnswer: string; takeaway: string }) {
  if (!NN.test(nn)) return { error: "bad mission number" }
  const takeaway = fields.takeaway.trim().replace(/\s+/g, " ")
  if (takeaway.length < 15) return { error: "Write your one-sentence takeaway first. That sentence is the point." }
  if (!fields.checkAnswer.trim()) return { error: "Answer the check question first." }
  saveNotebook(nn, { notes: fields.notes, checkAnswer: fields.checkAnswer, takeaway })
  const row = readProgress().missions.find((m) => m.nn === nn)
  if (row?.status !== "done") {
    try {
      await completeMission(nn, takeaway)
    } catch (err) {
      return { error: `./lab done failed: ${err instanceof Error ? err.message : String(err)}` }
    }
  }
  revalidatePath("/", "layout")
  return { ok: true }
}
