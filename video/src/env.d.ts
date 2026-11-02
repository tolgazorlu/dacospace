// webpack's require.context, which Remotion's bundler provides.
interface ImportMeta {
  webpackContext(dir: string, opts: { regExp: RegExp }): { keys(): string[]; <T = any>(key: string): T }
}
