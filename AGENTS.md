<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## dacospace

Daily system design interview questions: Next.js web app + stdio MCP server
sharing `lib/core/`. Questions are markdown in `questions/` (format in
`questions/README.md`), personal data in `data/` (gitignored).

- Verify: `pnpm test && pnpm lint && pnpm typecheck && pnpm build`.
- Factory protocol: `~/projects/cortex/playbooks/factory.md`, project note
  `~/projects/cortex/projects/dacospace.md`.
