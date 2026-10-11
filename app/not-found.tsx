import Link from "next/link"

export default function NotFound() {
  return (
    <article>
      <p className="text-sm text-muted-foreground">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Nothing here</h1>
      <p className="mt-4 text-muted-foreground">
        That page does not exist. Missions and lessons appear once they are written.
      </p>
      <p className="mt-8 flex gap-6 text-sm">
        <Link href="/" className="font-medium underline underline-offset-4">Today</Link>
        <Link href="/lab" className="font-medium underline underline-offset-4">All missions</Link>
      </p>
    </article>
  )
}
