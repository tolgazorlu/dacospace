import type { RunResult } from "@/lib/core/lab"
import { getT } from "@/lib/i18n/server"

const ms = (v: number | null) => (v === null ? "–" : v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${v.toFixed(v < 10 ? 1 : 0)} ms`)
const time = (at: string) => {
  const today = new Date().toISOString().slice(0, 10)
  return at.slice(0, 10) === today ? at.slice(11, 16) : at.slice(5, 10)
}

/** Latest k6 runs, each compared with the previous run of the same scenario. */
export async function ResultsTable({ results }: { results: RunResult[] }) {
  const t = await getT()
  if (!results.length) {
    return <p className="mt-2 text-sm text-muted-foreground">{t.results.empty}</p>
  }
  const prevP95 = (i: number) => results.slice(i + 1).find((r) => r.scenario === results[i].scenario)?.p95 ?? null
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-xs tabular-nums">
        <thead className="text-left text-muted-foreground">
          <tr>
            <th className="py-1.5 pr-3 font-normal">{t.results.at}</th>
            <th className="py-1.5 pr-3 font-normal">{t.results.scenario}</th>
            <th className="py-1.5 pr-3 text-right font-normal">req/s</th>
            <th className="py-1.5 pr-3 text-right font-normal">p95</th>
            <th className="py-1.5 pr-3 text-right font-normal">{t.results.failed}</th>
            <th className="py-1.5 text-right font-normal">{t.results.dropped}</th>
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
                      {t.results.acceptedRejected(r.accepted, r.rejected ?? 0)}
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
                <td className={`py-1.5 pr-3 text-right ${r.failedPct >= 1 ? "font-semibold" : "text-muted-foreground"}`}>{r.failedPct.toFixed(1)}%</td>
                <td className="py-1.5 text-right">{r.dropped || "–"}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
