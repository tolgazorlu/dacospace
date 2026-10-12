"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useT } from "@/components/i18n"
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
  const t = useT()

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

  if (!env) return <p className="text-sm text-muted-foreground">{t.env.checking}</p>

  const infraUp = env.services.length > 0 && env.services.every((s) => s.state === "running")
  return (
    <section aria-label={t.env.label} className="text-sm">
      <h2 className="text-sm font-semibold">{t.env.title}</h2>
      <ul className="mt-2 space-y-1.5">
        {env.docker === "stopped" ? (
          <li className="flex items-center gap-2 text-muted-foreground">
            <Dot on={false} /> {t.env.dockerOff}
          </li>
        ) : (
          <li className="flex items-center gap-2">
            <Dot on={infraUp} />
            <span className={infraUp ? "" : "text-muted-foreground"}>
              {env.services.length === 0
                ? t.env.infraStopped
                : env.services.map((s) => `${LABELS[s.name] ?? s.name}${s.state === "running" ? "" : ` (${s.state})`}`).join(" · ")}
            </span>
            {!infraUp && (
              <Button size="xs" variant="outline" className="ml-auto" disabled={busy} onClick={() => run("./lab up")}>
                {t.env.start}
              </Button>
            )}
          </li>
        )}
        <li className="flex items-center gap-2">
          <Dot on={env.app === "up"} warn={env.app === "starting"} />
          <span className={env.app === "up" ? "" : "text-muted-foreground"}>
            {t.env.app(env.app)}
          </span>
          <span className="ml-auto flex gap-1">
            {env.app === "down" && (
              <Button size="xs" variant="outline" disabled={pending || !infraUp} onClick={() => app("start-app")}>
                {t.env.start}
              </Button>
            )}
            {env.app !== "down" && env.appOwned && (
              <Button size="xs" variant="ghost" disabled={pending} onClick={() => app("stop-app")}>
                {t.env.stop}
              </Button>
            )}
            {(env.appOwned || env.app !== "down") && (
              <Button size="xs" variant="ghost" onClick={() => setShowLog((s) => !s)}>
                {showLog ? t.env.hideLog : t.env.log}
              </Button>
            )}
          </span>
        </li>
      </ul>
      {env.app === "up" && !env.appOwned && (
        <p className="mt-1.5 text-xs text-muted-foreground">{t.env.outside}</p>
      )}
      {showLog && (
        <pre className="mt-2 max-h-56 overflow-auto rounded-md bg-muted p-2 font-mono text-[0.6875rem] leading-snug whitespace-pre-wrap">
          {env.log || t.env.noLog}
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
