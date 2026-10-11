import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"

/** Lesson and case prose. External links open in a new tab; tables scroll instead of overflowing. */
export function AiMarkdown({ source }: { source: string }) {
  return (
    <div className="prose-daco prose-lesson">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) =>
            href?.startsWith("http") ? (
              <a href={href} target="_blank" rel="noreferrer">
                {children}
              </a>
            ) : (
              <a href={href}>{children}</a>
            ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {source}
      </Markdown>
    </div>
  )
}
