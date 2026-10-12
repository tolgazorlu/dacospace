import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { BUDGET_MS, CAPACITY, TODAY, p99 } from "../figures/feature-flags/model.mjs"

describe("feature flag hint figure", () => {
  it("puts today's traffic just under the 1 ms budget and a little more over it", () => {
    expect(p99(TODAY)).toBeLessThan(BUDGET_MS)
    expect(p99(TODAY + 2000)).toBeGreaterThan(BUDGET_MS)
    expect(p99(CAPACITY)).toBe(Infinity)
  })

  it("ships a built page per language and theme", () => {
    for (const lang of ["en", "tr"]) for (const theme of ["dark", "light"]) {
      const file = path.join(__dirname, "..", "public", "figures", "feature-flags", `${lang}-${theme}.html`)
      expect(fs.readFileSync(file, "utf8")).toContain(`<html lang="${lang}"`)
    }
  })
})
