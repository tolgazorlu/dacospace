import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      // `server-only` throws outside Next.js; the tests import server modules directly.
      "server-only": path.resolve(__dirname, "tests/fixtures/server-only.ts"),
      "@": __dirname,
    },
  },
})
