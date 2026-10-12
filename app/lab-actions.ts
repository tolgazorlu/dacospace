"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { readProgress } from "@/lib/core/lab"
import { markLessonRead, saveNotebook } from "@/lib/core/notebook"
import { completeMission } from "@/lib/server/lab-env"
import { assertLocal } from "@/lib/server/guard"
import { getT } from "@/lib/i18n/server"

const NN = /^\d{2}$/

export async function saveNotebookAction(nn: string, fields: { notes: string; checkAnswer: string; takeaway: string }) {
  assertLocal()
  if (!NN.test(nn)) return { error: (await getT()).notebook.badMission }
  saveNotebook(nn, { notes: fields.notes, checkAnswer: fields.checkAnswer, takeaway: fields.takeaway.trim() })
  revalidatePath(`/lab/${nn}`)
  return { ok: true }
}

export async function lessonReadAction(nn: string) {
  assertLocal()
  if (!NN.test(nn)) return
  markLessonRead(nn)
  revalidatePath("/", "layout")
  redirect(`/lab/${nn}`)
}

export async function completeMissionAction(nn: string, fields: { notes: string; checkAnswer: string; takeaway: string }) {
  assertLocal()
  const t = await getT()
  if (!NN.test(nn)) return { error: t.notebook.badMission }
  const takeaway = fields.takeaway.trim().replace(/\s+/g, " ")
  if (takeaway.length < 15) return { error: t.notebook.needTakeaway }
  if (!fields.checkAnswer.trim()) return { error: t.notebook.needCheck }
  saveNotebook(nn, { notes: fields.notes, checkAnswer: fields.checkAnswer, takeaway })
  const row = readProgress().missions.find((m) => m.nn === nn)
  if (row?.status !== "done") {
    try {
      await completeMission(nn, takeaway)
    } catch (err) {
      return { error: t.notebook.labDoneFailed(err instanceof Error ? err.message : String(err)) }
    }
  }
  revalidatePath("/", "layout")
  return { ok: true }
}
