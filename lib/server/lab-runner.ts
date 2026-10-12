import "server-only"
import { spawn, type ChildProcess } from "node:child_process"
import path from "node:path"
import { labDir } from "@/lib/core/paths"
import { childEnv } from "./child-env"
import { assertLocal } from "./guard"

const ANSI = /\x1b\[[0-9;?]*[A-Za-z]/g

type Running = { label: string; child: ChildProcess; startedAt: number }

// One command at a time: two load tests at once would measure each other.
// Kept on globalThis so dev-mode module reloads do not lose track of it.
const g = globalThis as unknown as { __labRunning?: Running | null }

export function currentRun(): { label: string; startedAt: number } | null {
  const r = g.__labRunning
  return r ? { label: r.label, startedAt: r.startedAt } : null
}

export function stopRun(): boolean {
  assertLocal()
  const r = g.__labRunning
  if (!r?.child.pid) return false
  try {
    process.kill(-r.child.pid, "SIGINT") // whole group: ./lab, docker run, k6
  } catch {
    r.child.kill("SIGINT")
  }
  return true
}

/**
 * Runs `./lab <argv>` in the lab checkout and streams merged stdout/stderr as
 * plain text. The last line is always "[exit N]" so the client knows the result.
 */
export function streamLab(argv: string[], label: string, signal: AbortSignal): Response {
  assertLocal()
  if (g.__labRunning) {
    return new Response(`busy: "${g.__labRunning.label}" is still running\n`, { status: 409 })
  }
  const child = spawn(path.join(labDir(), "lab"), argv, {
    cwd: labDir(),
    detached: true, // own process group, so Stop reaches docker/k6 children too
    env: childEnv(),
  })
  g.__labRunning = { label, child, startedAt: Date.now() }
  const enc = new TextEncoder()

  // Set once the client stops reading; enqueue/close on a cancelled stream throws ERR_INVALID_STATE.
  let closed = false
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (s: string) => {
        if (!closed) controller.enqueue(enc.encode(s))
      }
      const onData = (b: Buffer) => send(b.toString("utf8").replace(ANSI, "").replace(/\r(?!\n)/g, "\n"))
      child.stdout?.on("data", onData)
      child.stderr?.on("data", onData)
      child.on("error", (err) => send(`\n${err.message}\n`))
      child.on("close", (code, sig) => {
        if (g.__labRunning?.child === child) g.__labRunning = null
        send(`\n[exit ${code ?? sig}]\n`)
        if (!closed) controller.close()
        closed = true
      })
      signal.addEventListener("abort", () => {
        // The tab went away: keep the command running (a load test should finish), just stop streaming.
        closed = true
      })
    },
    cancel() {
      closed = true
    },
  })
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" },
  })
}
