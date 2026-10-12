import "server-only"
import { execFile, spawn } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { promisify } from "node:util"
import { dataDir, labDir } from "@/lib/core/paths"
import { childEnv } from "./child-env"
import { assertLocal } from "./guard"

const exec = promisify(execFile)

export const APP_URL = "http://localhost:4180"
export const GRAFANA_URL = "http://localhost:4182"

export type ServiceState = { name: string; state: string; health: string }
export type AppState = "up" | "starting" | "down"
export type LabEnv = {
  docker: "running" | "stopped"
  services: ServiceState[]
  app: AppState
  appOwned: boolean
}

const pidFile = () => path.join(dataDir(), "lab", "app.pid")
export const appLogFile = () => path.join(dataDir(), "lab", "app.log")

async function ok(url: string, ms = 800): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(ms), cache: "no-store" })
    return res.ok
  } catch {
    return false
  }
}

function ownedPid(): number | null {
  try {
    const pid = Number(fs.readFileSync(pidFile(), "utf8"))
    process.kill(pid, 0) // throws when the process is gone
    return pid
  } catch {
    return null
  }
}

async function services(): Promise<{ docker: LabEnv["docker"]; services: ServiceState[] }> {
  try {
    const { stdout } = await exec("docker", ["compose", "ps", "--all", "--format", "json"], { cwd: labDir(), timeout: 5000 })
    const rows = stdout.trim().startsWith("[")
      ? JSON.parse(stdout)
      : stdout.trim().split("\n").filter(Boolean).map((l) => JSON.parse(l))
    return {
      docker: "running",
      services: rows.map((r: { Service: string; State: string; Health?: string }) => ({
        name: r.Service,
        state: r.State,
        health: r.Health ?? "",
      })),
    }
  } catch {
    return { docker: "stopped", services: [] }
  }
}

export async function labEnv(): Promise<LabEnv> {
  assertLocal()
  const [svc, healthy] = await Promise.all([services(), ok(`${APP_URL}/actuator/health`)])
  const pid = ownedPid()
  return { ...svc, app: healthy ? "up" : pid ? "starting" : "down", appOwned: Boolean(pid) }
}

/** Starts `./lab run` in the background, detached, logging to data/lab/app.log. */
export async function startApp(): Promise<void> {
  assertLocal()
  if (await ok(`${APP_URL}/actuator/health`)) return
  if (ownedPid()) return
  fs.mkdirSync(path.dirname(pidFile()), { recursive: true })
  const out = fs.openSync(appLogFile(), "w")
  const child = spawn(path.join(labDir(), "lab"), ["run"], {
    cwd: labDir(),
    detached: true,
    stdio: ["ignore", out, out],
    env: childEnv(),
  })
  child.unref()
  fs.closeSync(out)
  fs.writeFileSync(pidFile(), String(child.pid))
}

/** Stops the app only if dacospace started it; an app started in a terminal is left alone. */
export function stopApp(): boolean {
  assertLocal()
  const pid = ownedPid()
  if (!pid) return false
  try {
    process.kill(-pid, "SIGTERM")
  } catch {
    process.kill(pid, "SIGTERM")
  }
  fs.rmSync(pidFile(), { force: true })
  return true
}

export function appLogTail(lines = 60): string {
  try {
    const text = fs.readFileSync(appLogFile(), "utf8")
    return text.split("\n").slice(-lines).join("\n")
  } catch {
    return ""
  }
}

/** Runs ./lab done NN "sentence" so PROGRESS.md stays the single source of truth. */
export async function completeMission(nn: string, takeaway: string): Promise<void> {
  assertLocal()
  await exec(path.join(labDir(), "lab"), ["done", nn, takeaway], { cwd: labDir(), timeout: 15000 })
}
