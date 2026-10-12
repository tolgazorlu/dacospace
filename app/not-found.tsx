import Link from "next/link"
import { getT } from "@/lib/i18n/server"

export default async function NotFound() {
  const t = await getT()
  return (
    <article>
      <p className="text-sm text-muted-foreground">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t.notFound.title}</h1>
      <p className="mt-4 text-muted-foreground">
        {t.notFound.text}
      </p>
      <p className="mt-8 flex gap-6 text-sm">
        <Link href="/" className="font-medium underline underline-offset-4">{t.notFound.today}</Link>
        <Link href="/lab" className="font-medium underline underline-offset-4">{t.notFound.missions}</Link>
      </p>
    </article>
  )
}
