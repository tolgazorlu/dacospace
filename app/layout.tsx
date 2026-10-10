import type { Metadata } from "next"
import Link from "next/link"
import { streak } from "@/lib/core/days"
import "./globals.css"

export const metadata: Metadata = {
  title: "dacospace",
  description: "One system design interview question a day.",
}

export const dynamic = "force-dynamic"

export default function RootLayout({ children }: LayoutProps<"/">) {
  const days = streak()
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <div className="mx-auto max-w-2xl px-5 pb-24">
          <header className="flex items-baseline justify-between py-8">
            <Link href="/" className="font-semibold tracking-tight">
              dacospace
            </Link>
            <nav className="flex items-baseline gap-5 text-sm text-muted-foreground">
              {days > 0 && <span className="tabular-nums">{days}-day streak</span>}
              <Link href="/archive" className="hover:text-foreground">
                Archive
              </Link>
            </nav>
          </header>
          <main className="pt-6">{children}</main>
        </div>
      </body>
    </html>
  )
}
