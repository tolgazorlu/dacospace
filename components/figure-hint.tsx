"use client"

import { Lightbulb } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useLang, useT } from "@/components/i18n"
import { useTheme } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"

/**
 * A hint behind a button: an interactive Anatomy figure (public/figures/<id>/<lang>-<theme>.html) that shows
 * where the problem comes from. Static, same-origin, sandboxed to scripts only.
 */
export function FigureHint({ id }: { id: string }) {
  const [open, setOpen] = useState(false)
  const [height, setHeight] = useState(560)
  const frame = useRef<HTMLIFrameElement>(null)
  const lang = useLang()
  const theme = useTheme()
  const t = useT()

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return
      const h = Number(event.data?.dacospaceFigure)
      if (Number.isFinite(h) && h > 100 && h < 2000) setHeight(Math.ceil(h))
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [])

  return (
    <section className="mt-8">
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Lightbulb className="size-4" aria-hidden />
        {open ? t.session.hideHint : t.session.showHint}
      </Button>
      {open && (
        <>
          <p className="mt-3 text-sm text-muted-foreground">{t.session.hintNote}</p>
          <iframe
            ref={frame}
            src={`/figures/${id}/${lang}-${theme}.html`}
            title={t.session.hintTitle}
            sandbox="allow-scripts"
            loading="lazy"
            className="mt-3 w-full rounded-lg border-0"
            style={{ height }}
          />
        </>
      )}
    </section>
  )
}
