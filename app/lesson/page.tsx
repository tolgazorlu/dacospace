import { redirect } from "next/navigation"
import { LabMissing } from "@/components/lab/lab-missing"
import { currentMission, labAvailable } from "@/lib/core/lab"

export default function CurrentLessonPage() {
  if (!labAvailable()) return <LabMissing />
  const m = currentMission()
  redirect(m?.lessonFile ? `/lesson/${m.nn}` : "/lab")
}
