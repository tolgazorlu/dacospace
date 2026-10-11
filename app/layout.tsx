import type { Metadata } from "next"
import Link from "next/link"
import { streak } from "@/lib/core/days"
import { NavLink } from "@/components/nav-link"
import { Shell } from "@/components/shell"
import { THEME_SCRIPT, ThemeToggle } from "@/components/theme-toggle"
import "./globals.css"

export const metadata: Metadata = {
  title: "dacospace",
  description: "A daily lesson, a hands-on scale lab and a system design interview question.",
}

export const dynamic = "force-dynamic"

export default function RootLayout({ children }: LayoutProps<"/">) {
  const days = streak()
  return (
    <html lang="en" className="dark h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <Shell>
          <header className="flex items-center justify-between gap-6 border-b py-6">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              dacospace
            </Link>
            <nav className="flex items-center gap-4 text-[15px] text-muted-foreground sm:gap-6 sm:text-base">
              {days > 0 && <span className="hidden tabular-nums sm:inline">{days}-day streak</span>}
              <NavLink href="/lab">Lab</NavLink>
              <NavLink href="/interview">Interview</NavLink>
              <NavLink href="/archive">Archive</NavLink>
              <ThemeToggle />
            </nav>
          </header>
          <main className="pt-12">{children}</main>
        </Shell>
      </body>
    </html>
  )
}
