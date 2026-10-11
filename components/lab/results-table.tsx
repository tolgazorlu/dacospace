import type { RunResult } from "@/lib/core/lab"

const ms = (v: number | null) => (v === null ? "–" : v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${v.toFixed(v < 10 ? 1 : 0)} ms`)
const time = (at: string) => {
  const today = new Date().toISOString().slice(0, 10)
  return at.slice(0, 10) === today ? at.slice(11, 16) : at.slice(5, 10)
}

/** Latest k6 runs, each compared with the previous run of the same scenario. */
export function ResultsTable({ results }: { results: RunResult[] }) {
  if (!results.length) {
    return <p className="mt-2 text-sm text-muted-foreground">No load test results yet. Run one from the mission.</p>
  }
  const prevP95 = (i: number) => results.slice(i + 1).find((r) => r.scenario === results[i].scenario)?.p95 ?? null
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-xs tabular-nums">
        <thead className="text-left text-muted-foreground">
          <tr>
            <th className="py-1.5 pr-3 font-normal">At</th>
            <th className="py-1.5 pr-3 font-normal">Scenario</th>
            <th className="py-1.5 pr-3 text-right font-normal">req/s</th>
            <th className="py-1.5 pr-3 text-right font-normal">p95</th>
            <th className="py-1.5 pr-3 text-right font-normal">failed</th>
            <th className="py-1.5 text-right font-normal">dropped</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {results.map((r, i) => {
            const prev = prevP95(i)
            const delta = prev && r.p95 ? ((r.p95 - prev) / prev) * 100 : null
            return (
              <tr key={r.file}>
                <td className="py-1.5 pr-3 font-mono whitespace-nowrap text-muted-foreground">{time(r.at)}</td>
                <td className="py-1.5 pr-3">
                  {r.scenario}
                  {r.targetRps ? <span className="text-muted-foreground"> @{r.targetRps}</span> : null}
                  {r.accepted !== null && (
                    <span className="block text-[0.6875rem] text-muted-foreground">
                      {r.accepted} accepted · {r.rejected ?? 0} rejected
                    </span>
                  )}
                </td>
                <td className="py-1.5 pr-3 text-right">{r.rps.toFixed(1)}</td>
                <td className="py-1.5 pr-3 text-right">
                  {ms(r.p95)}
                  {delta !== null && Math.abs(delta) >= 1 && (
                    <span className="block text-[0.6875rem] text-muted-foreground">
                      {delta > 0 ? "+" : "−"}
                      {Math.abs(delta).toFixed(0)}%
                    </span>
                  )}
                </td>
                <td className={`py-1.5 pr-3 text-right ${r.failedPct >= 1 ? "text-destructive" : ""}`}>{r.failedPct.toFixed(1)}%</td>
                <td className="py-1.5 text-right">{r.dropped || "–"}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
