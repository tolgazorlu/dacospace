import { parseLabLine } from "@/lib/core/lab-commands"
import { labAvailable, listScenarios } from "@/lib/core/lab"
import { rejectUnlessLocal } from "@/lib/server/guard"
import { currentRun, stopRun, streamLab } from "@/lib/server/lab-runner"

export const dynamic = "force-dynamic"

/** Body: { line: "./lab load orders 40" }. Streams the command output as text. */
export async function POST(req: Request) {
  const refused = rejectUnlessLocal(req)
  if (refused) return refused
  if (!labAvailable()) return new Response("java-scale-lab checkout not found (set DACOSPACE_LAB_DIR)", { status: 503 })
  const body = (await req.json().catch(() => ({}))) as { line?: unknown }
  const line = typeof body.line === "string" ? body.line : ""
  const cmd = parseLabLine(line, listScenarios())
  if (!cmd) return new Response(`not an allowed lab command: ${line}`, { status: 400 })
  return streamLab(cmd.argv, cmd.label, req.signal)
}

export async function GET(req: Request) {
  const refused = rejectUnlessLocal(req)
  if (refused) return refused
  return Response.json({ running: currentRun() })
}

export async function DELETE(req: Request) {
  const refused = rejectUnlessLocal(req)
  if (refused) return refused
  return Response.json({ stopped: stopRun() })
}
