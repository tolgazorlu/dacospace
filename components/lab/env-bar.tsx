"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { HEADERS, useConsole } from "./console-context"

type Env = {
  docker: "running" | "stopped"
  services: { name: string; state: string; health: string }[]
  app: "up" | "starting" | "down"
  appOwned: boolean
  log?: string
}

const LABELS: Record<string, string> = { postgres: "Postgres", lgtm: "Grafana", payment: "Payments" }

function Dot({ on, warn }: { on: boolean; warn?: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block size-1.5 shrink-0 rounded-full ${warn ? "animate-pulse bg-muted-foreground" : on ? "bg-foreground" : "border border-muted-foreground"}`}
    />
  )
}

export function EnvBar() {
  const { run, busy } = useConsole()
  const [env, setEnv] = useState<Env | null>(null)
  const [showLog, setShowLog] = useState(false)
  const [pending, setPending] = useState(false)

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/lab/env${showLog ? "?log" : ""}`, { cache: "no-store", headers: HEADERS })
    if (res.ok) setEnv(await res.json())
  }, [showLog])

  useEffect(() => {
    const first = setTimeout(refresh, 0)
    const t = setInterval(refresh, env?.app === "starting" ? 2000 : 5000)
    return () => {
      clearTimeout(first)
      clearInterval(t)
    }
  }, [refresh, env?.app])

  const app = async (action: "start-app" | "stop-app") => {
    setPending(true)
    const res = await fetch("/api/lab/env", { method: "POST", headers: HEADERS, body: JSON.stringify({ action }) })
    if (res.ok) setEnv({ ...(await res.json()), log: env?.log })
    setPending(false)
  }

  if (!env) return <p className="text-sm text-muted-foreground">Checking the lab environment…</p>

  const infraUp = env.services.length > 0 && env.services.every((s) => s.state === "running")
  return (
    <section aria-label="Lab environment" className="text-sm">
      <h2 className="text-sm font-semibold">Environment</h2>
      <ul className="mt-2 space-y-1.5">
        {env.docker === "stopped" ? (
          <li className="flex items-center gap-2 text-muted-foreground">
            <Dot on={false} /> Docker is not running. Open Docker Desktop first.
          </li>
        ) : (
          <li className="flex items-center gap-2">
            <Dot on={infraUp} />
            <span className={infraUp ? "" : "text-muted-foreground"}>
              {env.services.length === 0
                ? "Infrastructure is stopped"
                : env.services.map((s) => `${LABELS[s.name] ?? s.name}${s.state === "running" ? "" : ` (${s.state})`}`).join(" · ")}
            </span>
            {!infraUp && (
              <Button size="xs" variant="outline" className="ml-auto" disabled={busy} onClick={() => run("./lab up")}>
                Start
              </Button>
            )}
          </li>
        )}
        <li className="flex items-center gap-2">
          <Dot on={env.app === "up"} warn={env.app === "starting"} />
          <span className={env.app === "up" ? "" : "text-muted-foreground"}>
            App on :4180 {env.app === "up" ? "is up" : env.app === "starting" ? "is starting…" : "is stopped"}
          </span>
          <span className="ml-auto flex gap-1">
            {env.app === "down" && (
              <Button size="xs" variant="outline" disabled={pending || !infraUp} onClick={() => app("start-app")}>
                Start
              </Button>
            )}
            {env.app !== "down" && env.appOwned && (
              <Button size="xs" variant="ghost" disabled={pending} onClick={() => app("stop-app")}>
                Stop
              </Button>
            )}
            {(env.appOwned || env.app !== "down") && (
              <Button size="xs" variant="ghost" onClick={() => setShowLog((s) => !s)}>
                {showLog ? "Hide log" : "Log"}
              </Button>
            )}
          </span>
        </li>
      </ul>
      {env.app === "up" && !env.appOwned && (
        <p className="mt-1.5 text-xs text-muted-foreground">Started outside dacospace. Restart it in that terminal.</p>
      )}
      {showLog && (
        <pre className="mt-2 max-h-56 overflow-auto rounded-md bg-muted p-2 font-mono text-[0.6875rem] leading-snug whitespace-pre-wrap">
          {env.log || "No log yet. The app log appears here when dacospace starts the app."}
        </pre>
      )}
      <p className="mt-3 flex gap-4 text-xs text-muted-foreground">
        <a className="hover:text-foreground" href="http://localhost:4182/d/scale-lab/scale-lab" target="_blank" rel="noreferrer">
          Grafana ↗
        </a>
        <a className="hover:text-foreground" href="http://localhost:4183" target="_blank" rel="noreferrer">
          Prometheus ↗
        </a>
        <a className="hover:text-foreground" href="http://localhost:4182/explore" target="_blank" rel="noreferrer">
          Traces ↗
        </a>
      </p>
    </section>
  )
}
