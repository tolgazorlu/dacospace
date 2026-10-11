import "server-only"

/**
 * Environment for ./lab child processes. Next.js sets PORT to its own port
 * (4120); a Spring app started with it inherited it and took over
 * dacospace's port. Strip the Next.js-specific variables.
 */
export function childEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, TERM: "dumb", NO_COLOR: "1" }
  for (const key of ["PORT", "HOSTNAME", "NODE_ENV", "NEXT_RUNTIME", "__NEXT_PRIVATE_ORIGIN"]) delete env[key]
  return env
}
