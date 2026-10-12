import type { Metadata } from "next"
import { LangProvider, LangToggle } from "@/components/i18n"
import { getLang } from "@/lib/i18n/server"
import { messages } from "@/lib/i18n/messages"
import Link from "next/link"
import { Clarity } from "@/components/clarity"
import { LocalStreak } from "@/components/hosted/local-streak"
import { streak } from "@/lib/core/days"
import { isHosted } from "@/lib/core/hosted"
import { NavLink } from "@/components/nav-link"
import { Shell } from "@/components/shell"
import { THEME_SCRIPT, ThemeToggle } from "@/components/theme-toggle"
import "./globals.css"

export async function generateMetadata(): Promise<Metadata> {
  return { title: "dacospace", description: messages(await getLang()).meta.description }
}

export const dynamic = "force-dynamic"

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const lang = await getLang()
  const t = messages(lang)
  const hosted = isHosted()
  const days = hosted ? 0 : streak()
  return (
    <html lang={lang} className="dark h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <LangProvider lang={lang}>
        <Shell hosted={hosted}>
          <header className="flex items-center justify-between gap-6 border-b py-6">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              dacospace
            </Link>
            <nav className="flex items-center gap-4 text-[15px] text-muted-foreground sm:gap-6 sm:text-base">
              {hosted ? <LocalStreak /> : days > 0 && <span className="hidden tabular-nums sm:inline">{t.nav.streak(days)}</span>}
              <NavLink href="/lab">{t.nav.lab}</NavLink>
              <NavLink href="/ai">{t.nav.ai}</NavLink>
              <NavLink href="/interview">{t.nav.interview}</NavLink>
              <NavLink href="/archive">{t.nav.archive}</NavLink>
              <LangToggle />
              <ThemeToggle />
            </nav>
          </header>
          <main className="pt-12">{children}</main>
        </Shell>
        </LangProvider>
        <Clarity />
      </body>
    </html>
  )
}
