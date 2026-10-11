"use client"

import { createContext, useCallback, useContext, useRef, useState } from "react"
import { useRouter } from "next/navigation"

export type Run = {
  id: number
  label: string
  output: string
  state: "running" | "ok" | "failed"
  exit: string | null
  startedAt: number
}

type Ctx = {
  runs: Run[]
  active: Run | null
  busy: boolean
  run: (line: string) => Promise<void>
  stop: () => Promise<void>
  select: (id: number) => void
}

const ConsoleContext = createContext<Ctx | null>(null)

export const HEADERS = { "Content-Type": "application/json", "x-dacospace": "1" }

export function ConsoleProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [runs, setRuns] = useState<Run[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const nextId = useRef(1)
  const busy = runs.some((r) => r.state === "running")

  const patch = (id: number, fn: (r: Run) => Run) => setRuns((all) => all.map((r) => (r.id === id ? fn(r) : r)))

  const run = useCallback(
    async (line: string) => {
      const id = nextId.current++
      setRuns((all) => [{ id, label: line, output: "", state: "running" as const, exit: null, startedAt: Date.now() }, ...all].slice(0, 12))
      setActiveId(id)
      try {
        const res = await fetch("/api/lab/run", { method: "POST", headers: HEADERS, body: JSON.stringify({ line }) })
        if (!res.ok || !res.body) {
          const msg = await res.text()
          patch(id, (r) => ({ ...r, output: msg, state: "failed", exit: String(res.status) }))
          return
        }
        const reader = res.body.getReader()
        const dec = new TextDecoder()
        let text = ""
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          text += dec.decode(value, { stream: true })
          const shown = text
          patch(id, (r) => ({ ...r, output: shown }))
        }
        const exit = text.match(/\[exit ([^\]]+)\]\s*$/)?.[1] ?? "?"
        patch(id, (r) => ({ ...r, output: text.replace(/\n?\[exit [^\]]+\]\s*$/, ""), exit, state: exit === "0" ? "ok" : "failed" }))
      } catch (err) {
        patch(id, (r) => ({ ...r, output: r.output + `\n${String(err)}`, state: "failed", exit: "error" }))
      } finally {
        router.refresh() // new results, PROGRESS changes
      }
    },
    [router],
  )

  const stop = useCallback(async () => {
    await fetch("/api/lab/run", { method: "DELETE", headers: HEADERS })
  }, [])

  const active = runs.find((r) => r.id === activeId) ?? runs[0] ?? null
  return (
    <ConsoleContext.Provider value={{ runs, active, busy, run, stop, select: setActiveId }}>{children}</ConsoleContext.Provider>
  )
}

export function useConsole() {
  const ctx = useContext(ConsoleContext)
  if (!ctx) throw new Error("useConsole outside ConsoleProvider")
  return ctx
}
