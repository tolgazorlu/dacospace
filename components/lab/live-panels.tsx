"use client"

import { useState } from "react"

// Panel ids from java-scale-lab infra/observability/dashboards/scale-lab.json
const VIEWS = {
  Latency: [4, 5],
  Saturation: [7, 9],
  Payments: [10, 8],
  Load: [2, 16],
  JVM: [12, 14],
} as const

type View = keyof typeof VIEWS

export function LivePanels({ grafanaUp }: { grafanaUp: boolean }) {
  const [view, setView] = useState<View>("Latency")
  const [range, setRange] = useState("10m")
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
      {grafanaUp ? (
        <div className="mt-3 space-y-2">
          {VIEWS[view].map((id) => (
            <iframe
              key={`${id}-${range}`}
              title={`Grafana panel ${id}`}
              src={`http://localhost:4182/d-solo/scale-lab/scale-lab?orgId=1&panelId=${id}&from=now-${range}&to=now&refresh=5s&theme=light`}
              className="h-64 w-full rounded-md border bg-background"
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
