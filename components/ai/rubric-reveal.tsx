"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useT } from "@/components/i18n"

/** Hides the rubric and pitfalls until the candidate has answered. */
export function RubricReveal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const t = useT()
  if (open) return <>{children}</>
  return (
    <div className="mt-10 border-t pt-8">
      <p className="text-sm text-muted-foreground">
        {t.ai.answerFirst}
      </p>
      <Button type="button" variant="outline" className="mt-4" onClick={() => setOpen(true)}>
        {t.ai.showRubric}
      </Button>
    </div>
  )
}
