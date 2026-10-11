"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

/** Hides the rubric and pitfalls until the candidate has answered. */
export function RubricReveal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  if (open) return <>{children}</>
  return (
    <div className="mt-10 border-t pt-8">
      <p className="text-sm text-muted-foreground">
        Answer first: out loud, on paper, or with the interview prompt above. Then compare with the rubric.
      </p>
      <Button type="button" variant="outline" className="mt-4" onClick={() => setOpen(true)}>
        Show rubric and pitfalls
      </Button>
    </div>
  )
}
