"use client"

import { useState, useTransition } from "react"
import Markdown from "react-markdown"
import { Button } from "@/components/ui/button"
import { useT } from "@/components/i18n"
import { Textarea } from "@/components/ui/textarea"
import { completeMissionAction, saveNotebookAction } from "@/app/lab-actions"
import type { Notebook as NB } from "@/lib/core/notebook"

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="mt-6 block first:mt-0">
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="mt-0.5 block text-sm text-muted-foreground">{hint}</span>}
      <span className="mt-2 block">{children}</span>
    </label>
  )
}

export function Notebook({
  nn,
  initial,
  evidenceTemplate,
  checkQuestion,
  done,
}: {
  nn: string
  initial: NB
  evidenceTemplate: string | null
  checkQuestion: string | null
  done: boolean
}) {
  const [notes, setNotes] = useState(initial.notes || evidenceTemplate || "")
  const [checkAnswer, setCheckAnswer] = useState(initial.checkAnswer)
  const [takeaway, setTakeaway] = useState(initial.takeaway)
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null)
  const [pending, start] = useTransition()
  const t = useT()
  const fields = { notes, checkAnswer, takeaway }

  return (
    <div>
      <Field label={t.notebook.evidence} hint={t.notebook.evidenceHint}>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-56 resize-y font-mono text-[0.8125rem] leading-relaxed"
        />
      </Field>
      {checkQuestion && (
        <Field label={t.notebook.check}>
          <div className="prose-daco mb-2 text-sm text-muted-foreground">
            <Markdown>{checkQuestion}</Markdown>
          </div>
          <Textarea value={checkAnswer} onChange={(e) => setCheckAnswer(e.target.value)} className="min-h-24 resize-y" />
        </Field>
      )}
      <Field label={t.notebook.own} hint={t.notebook.ownHint}>
        <Textarea value={takeaway} onChange={(e) => setTakeaway(e.target.value)} className="min-h-16 resize-y" />
      </Field>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await saveNotebookAction(nn, fields)
              setMsg(res.error ? { text: res.error, error: true } : { text: t.common.saved })
            })
          }
        >
          {t.common.save}
        </Button>
        {!done && (
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await completeMissionAction(nn, fields)
                setMsg(res.error ? { text: res.error, error: true } : { text: t.notebook.completed(nn) })
              })
            }
          >
            {t.notebook.complete}
          </Button>
        )}
        {msg && <span role={msg.error ? "alert" : "status"} className={`text-sm ${msg.error ? "font-medium text-foreground" : "text-muted-foreground"}`}>{msg.text}</span>}
      </div>
    </div>
  )
}
