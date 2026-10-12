import type { NextConfig } from "next"

// Local-first app: pages read questions/ and data/ on every request.
const nextConfig: NextConfig = {
  // The bank is read with fs at runtime, which file tracing cannot see; ship it with every route.
  outputFileTracingIncludes: { "/**": ["./questions/*.md"] },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
}

export default nextConfig
