import type { NextConfig } from "next"

// Local-first app: pages read questions/ and data/ on every request.
const nextConfig: NextConfig = {
  // The bank and the content/ snapshot are read with fs at runtime, which file tracing cannot see; ship it with every route.
  outputFileTracingIncludes: { "/**": ["./questions/**/*.md", "./content/**/*.md"] },
  // Basic hardening; the app frames Grafana locally but is never framed itself.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ]
  },
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
