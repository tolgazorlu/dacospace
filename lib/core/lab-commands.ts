/**
 * Which ./lab command lines dacospace may run. Pure (no fs), so the client can
 * decide where to draw Run buttons and the server can re-check before spawning.
 *
 * Lines are executed as an argv array, never through a shell.
 */

export const CHAOS_MODES = ["normal", "slow", "very-slow", "hang", "errors", "down"] as const
export const PROFILES = ["cache", "events", "scale", "chaos"] as const

/** Splits a command line like a shell would for plain words and quoted strings. */
export function tokenize(line: string): string[] | null {
  const out: string[] = []
  let cur = ""
  let quote: '"' | "'" | null = null
  let started = false
  for (const ch of line.trim()) {
    if (quote) {
      if (ch === quote) quote = null
      else cur += ch
    } else if (ch === '"' || ch === "'") {
      quote = ch
      started = true
    } else if (/\s/.test(ch)) {
      if (started) out.push(cur)
      cur = ""
      started = false
    } else if (";|&`$<>(){}\\".includes(ch)) {
      return null // shell syntax: not something we run
    } else {
      cur += ch
      started = true
    }
  }
  if (quote) return null
  if (started) out.push(cur)
  return out
}

export type LabCommand = { argv: string[]; label: string; heavy: boolean }

/**
 * Parses "./lab load orders 40" into argv ["load", "orders", "40"].
 * `scenarios` is the list of files in load/ (without .js); pass null to skip that check.
 */
export function parseLabLine(line: string, scenarios: string[] | null): LabCommand | null {
  const t = tokenize(line)
  if (!t || t[0] !== "./lab" || t.length < 2) return null
  const [cmd, ...args] = t.slice(1)
  const scenarioOk = (s?: string) => !!s && /^[a-z0-9-]+$/.test(s) && (scenarios === null || scenarios.includes(s))
  const ok = (() => {
    switch (cmd) {
      case "down":
      case "seed":
      case "test":
      case "status":
      case "topsql":
      case "race":
        return args.length === 0
      case "up":
        return args.every((a) => (PROFILES as readonly string[]).includes(a))
      case "load":
        return (args.length === 1 || args.length === 2) && scenarioOk(args[0]) &&
          (args.length === 1 || (/^\d{1,4}$/.test(args[1]) && Number(args[1]) > 0))
      case "compare":
        return args.length === 1 && scenarioOk(args[0])
      case "sql":
      case "explain":
        return args.length === 1 && args[0].trim().length > 0 && args[0].length < 2000
      case "chaos":
        return args.length === 2 && args[0] === "payment" && (CHAOS_MODES as readonly string[]).includes(args[1])
      default:
        return false // run, reset, done and anything new go through dedicated UI
    }
  })()
  if (!ok) return null
  return { argv: [cmd, ...args], label: line.trim(), heavy: cmd === "load" || cmd === "race" || cmd === "seed" || cmd === "test" }
}
