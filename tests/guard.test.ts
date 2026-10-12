import { describe, expect, it } from "vitest"
import { rejectUnlessLocal } from "@/lib/server/guard"

const req = (headers: Record<string, string>, method = "GET") => new Request("http://localhost:4120/api/lab/env", { method, headers })

describe("rejectUnlessLocal", () => {
  it("answers the app's own fetches", () => {
    expect(rejectUnlessLocal(req({ host: "localhost:4120", "x-dacospace": "1" }))).toBeNull()
    expect(rejectUnlessLocal(req({ host: "127.0.0.1:4120", origin: "http://127.0.0.1:4120", "x-dacospace": "1" }, "POST"))).toBeNull()
  })

  it("refuses DNS rebinding, other origins and header-less requests on every method", () => {
    expect(rejectUnlessLocal(req({ host: "evil.example", "x-dacospace": "1" }))?.status).toBe(403)
    expect(rejectUnlessLocal(req({ host: "localhost:4120", origin: "http://evil.example", "x-dacospace": "1" }, "POST"))?.status).toBe(403)
    expect(rejectUnlessLocal(req({ host: "localhost:4120" }))?.status).toBe(403)
    expect(rejectUnlessLocal(req({ host: "localhost:4120" }, "POST"))?.status).toBe(403)
  })
})
