import { rejectUnlessLocal } from "@/lib/server/guard"
import { appLogTail, labEnv, startApp, stopApp } from "@/lib/server/lab-env"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const refused = rejectUnlessLocal(req)
  if (refused) return refused
  const withLog = new URL(req.url).searchParams.has("log")
  return Response.json({ ...(await labEnv()), log: withLog ? appLogTail() : undefined })
}

/** Body: { action: "start-app" | "stop-app" } */
export async function POST(req: Request) {
  const refused = rejectUnlessLocal(req)
  if (refused) return refused
  const { action } = (await req.json().catch(() => ({}))) as { action?: string }
  if (action === "start-app") await startApp()
  else if (action === "stop-app") stopApp()
  else return new Response("unknown action", { status: 400 })
  return Response.json(await labEnv())
}
