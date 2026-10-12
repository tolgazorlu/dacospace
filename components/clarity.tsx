"use client"
// Microsoft Clarity, loaded only when NEXT_PUBLIC_CLARITY_ID is set (production env on the host).
import Script from "next/script"

export function Clarity() {
  const id = process.env.NEXT_PUBLIC_CLARITY_ID
  if (!id || !/^[a-z0-9]+$/i.test(id)) return null
  return <Script id="ms-clarity" async strategy="afterInteractive" src={`https://www.clarity.ms/tag/${id}`} />
}
