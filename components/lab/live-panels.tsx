"use client"

import { useEffect, useState } from "react"
import { useTheme } from "@/components/theme-toggle"

// Panel ids from java-scale-lab infra/observability/dashboards/scale-lab.json
const VIEWS = {
  Latency: [4, 5],
  Saturation: [7, 9],
  Payments: [10, 8],
  Load: [2, 16],
  JVM: [12, 14],
} as const

type View = keyof typeof VIEWS

/** Why a panel can say "No data", in the order you hit them. */
function hint(app: string | null, view: View): string | null {
  if (app === "down") return "The app is stopped, so Prometheus has nothing to scrape. Start it in Environment above."
  if (app === "starting") return "The app is starting. Metrics appear about 10 seconds after it is up."
  if (app === "up" && (view === "Latency" || view === "Load" || view === "Payments"))
    return "These panels need traffic. Run a load test from the mission; they fill within ~10 seconds."
  return null
}

export function LivePanels({ grafanaUp }: { grafanaUp: boolean }) {
  const [view, setView] = useState<View>("Latency")
  const [range, setRange] = useState("10m")
  const [app, setApp] = useState<string | null>(null)
  useEffect(() => {
    const poll = async () => {
      const res = await fetch("/api/lab/env", { cache: "no-store" }).catch(() => null)
      if (res?.ok) setApp((await res.json()).app)
    }
    const first = setTimeout(poll, 0)
    const t = setInterval(poll, 5000)
    return () => {
      clearTimeout(first)
      clearInterval(t)
    }
  }, [])
  const note = hint(app, view)
  const theme = useTheme()
  return (
    <section aria-label="Live metrics">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold">Live metrics</h2>
        <select
          aria-label="Time range"
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="bg-transparent text-xs text-muted-foreground"
        >
          {["5m", "10m", "30m", "1h"].map((r) => (
            <option key={r} value={r}>
              last {r}
            </option>
          ))}
        </select>
      </div>
      <div role="tablist" className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {(Object.keys(VIEWS) as View[]).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={v === view}
            onClick={() => setView(v)}
            className={v === view ? "font-medium text-foreground underline underline-offset-4" : "text-muted-foreground hover:text-foreground"}
          >
            {v}
          </button>
        ))}
      </div>
      {grafanaUp && note && <p className="mt-3 text-xs text-muted-foreground">{note}</p>}
      {grafanaUp ? (
        <div className="mt-3 space-y-2">
          {VIEWS[view].map((id) => (
            <iframe
              key={`${id}-${range}-${theme}`}
              title={`Grafana panel ${id}`}
              src={`http://localhost:4182/d-solo/scale-lab/scale-lab?orgId=1&panelId=${id}&from=now-${range}&to=now&refresh=5s&theme=${theme}&hideLogo=true`}
              className="h-64 w-full rounded-md border bg-background grayscale"
              loading="lazy"
            />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Start the infrastructure to see Grafana panels here.</p>
      )}
    </section>
  )
}
