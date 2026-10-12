import type { NextConfig } from "next"

// Local-first app: pages read questions/ and data/ on every request.
const nextConfig: NextConfig = {
  // The bank and the content/ snapshot are read with fs at runtime, which file tracing cannot see; ship it with every route.
  outputFileTracingIncludes: { "/**": ["./questions/**/*.md", "./content/**/*.md"] },
  // Basic hardening. Pages are never framed; the static hint figures under /figures are framed by our own pages only.
  async headers() {
    const common = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ]
    return [
      { source: "/((?!figures/).*)", headers: [...common, { key: "X-Frame-Options", value: "DENY" }] },
      {
        source: "/figures/:path*",
        headers: [
          ...common,
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-ancestors 'self'" },
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
