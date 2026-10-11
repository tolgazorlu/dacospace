import "server-only"

/**
 * dacospace runs shell commands on this machine, so its API only answers the
 * local browser tab it served:
 *  - Host must be localhost / 127.0.0.1 (blocks DNS rebinding),
 *  - Origin, when sent, must be that same host (blocks other sites posting here),
 *  - a custom header is required, which a cross-site form or <img> cannot add.
 */
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/

export function rejectUnlessLocal(req: Request): Response | null {
  const host = req.headers.get("host") ?? ""
  if (!LOCAL.test(host)) return new Response("dacospace only answers on localhost", { status: 403 })
  const origin = req.headers.get("origin")
  if (origin) {
    let originHost = ""
    try {
      originHost = new URL(origin).host
    } catch {}
    if (originHost !== host) return new Response("cross-origin request refused", { status: 403 })
  }
  if (req.method !== "GET" && req.headers.get("x-dacospace") !== "1") {
    return new Response("missing x-dacospace header", { status: 403 })
  }
  return null
}
