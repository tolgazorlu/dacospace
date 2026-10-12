"use client"

import { useState, useTransition } from "react"
import { caseHypothesisAction } from "@/app/ai-actions"
import { Button } from "@/components/ui/button"

/**
 * The reader writes a hypothesis before the autopsy is shown. Reveal works with an empty box too,
 * but the button says so, because guessing first is the point of a case file.
 * hosted: nothing is saved on the server; Reveal only opens the autopsy in this tab.
 */
export function CaseReveal({
  slug,
  initial,
  revealed,
  hosted = false,
  children,
}: {
  slug: string
  initial: string
  revealed: boolean
  hosted?: boolean
  children: React.ReactNode
}) {
  const [text, setText] = useState(initial)
  const [open, setOpen] = useState(revealed)
  const [saved, setSaved] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const save = (reveal: boolean) => {
    if (hosted) return setOpen(reveal || open)
    start(async () => {
      const res = await caseHypothesisAction(slug, text, reveal)
      if (res?.ok) {
        setSaved(reveal ? null : "Saved")
        if (reveal) setOpen(true)
      }
    })
  }

  return (
    <>
      <section className="mt-10 rounded-lg border p-4" aria-label="Your hypothesis">
        <label htmlFor="hypothesis" className="text-sm font-medium">
          Your hypothesis
        </label>
        <p className="mt-1 text-sm text-muted-foreground">
          Answer the questions above before you read on: what failed, why, and what would have stopped it.
        </p>
        <textarea
          id="hypothesis"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setSaved(null)
          }}
          rows={6}
          className="mt-3 w-full resize-y rounded-md border bg-background p-3 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="1. ...&#10;2. ...&#10;3. ..."
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {!open && (
            <Button type="button" onClick={() => save(true)} disabled={pending}>
              {text.trim() ? (hosted ? "Reveal what happened" : "Save and reveal what happened") : "Reveal without guessing"}
            </Button>
          )}
          {!hosted && (
            <Button type="button" variant="outline" onClick={() => save(false)} disabled={pending}>
              Save
            </Button>
          )}
          {saved && (
            <span role="status" className="text-sm text-muted-foreground">
              {saved}
            </span>
          )}
        </div>
      </section>
      {open && <div className="mt-12">{children}</div>}
    </>
  )
}
