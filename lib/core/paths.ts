import path from "node:path"

/** Repo root. The MCP server sets DACOSPACE_ROOT; Next.js runs from the root. */
export const rootDir = () => process.env.DACOSPACE_ROOT ?? process.cwd()
export const questionsDir = () => path.join(rootDir(), "questions")
/** Personal answers and reviews. Gitignored by default. */
export const dataDir = () => process.env.DACOSPACE_DATA ?? path.join(rootDir(), "data")
