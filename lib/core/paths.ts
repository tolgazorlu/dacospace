import path from "node:path"

/** Repo root. The MCP server sets DACOSPACE_ROOT; Next.js runs from the root. */
export const rootDir = () => process.env.DACOSPACE_ROOT ?? process.cwd()
export const questionsDir = () => path.join(rootDir(), "questions")
/** Personal answers and reviews. Gitignored by default. */
export const dataDir = () => process.env.DACOSPACE_DATA ?? path.join(rootDir(), "data")
/**
 * The java-scale-lab checkout whose lessons, missions and ./lab CLI dacospace drives.
 * Default: a sibling folder, so `git clone` both repos into the same parent and it just works.
 */
export const labDir = () => process.env.DACOSPACE_LAB_DIR ?? path.resolve(rootDir(), "..", "java-scale-lab")
