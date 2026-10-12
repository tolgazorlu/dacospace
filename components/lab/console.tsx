"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { useT } from "@/components/i18n"
import { useConsole } from "./console-context"

export function Console() {
  const { runs, active, busy, stop, select } = useConsole()
  const box = useRef<HTMLPreElement>(null)
  const t = useT()
  const [now, setNow] = useState(0)
  const running = active?.state === "running"
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [running])
  const elapsed = running && now ? Math.max(0, Math.round((now - active.startedAt) / 1000)) : 0
  useEffect(() => {
    const el = box.current
    if (el) el.scrollTop = el.scrollHeight
  }, [active?.output])

  return (
    <section aria-label={t.console.title}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold">{t.console.title}</h2>
        {busy && (
          <Button size="xs" variant="outline" onClick={stop}>
            {t.console.stop}
          </Button>
        )}
      </div>
      {!active ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {t.console.empty}
        </p>
      ) : (
        <>
          <p className="mt-2 flex items-baseline gap-2 font-mono text-xs">
            <span className="truncate">{active.label}</span>
            <span
              className={`ml-auto shrink-0 ${active.state === "failed" ? "font-semibold text-foreground" : "text-muted-foreground"}`}
            >
              {running ? t.console.running(elapsed) : t.console.exit(active.exit)}
            </span>
          </p>
          <pre
            ref={box}
            aria-live="polite"
            className="mt-2 max-h-80 min-h-24 overflow-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap"
          >
            {active.output || (running ? "…" : t.console.noOutput)}
          </pre>
          {running && active.label.includes(" load ") && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {t.console.k6}
            </p>
          )}
          {runs.length > 1 && (
            <ol className="mt-2 space-y-0.5">
              {runs.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => select(r.id)}
                    className={`w-full truncate text-left font-mono text-xs hover:text-foreground ${r.id === active.id ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    {r.state === "running" ? "…" : r.state === "ok" ? "✓" : "✗"} {r.label}
                  </button>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  )
}
