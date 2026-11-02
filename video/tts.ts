// Reads every scene's `say` text with ElevenLabs and writes public/audio/<id>.mp3 plus
// src/durations.json (seconds per scene) so the video timing follows the voice.
// Usage: node tts.ts <question-id> [--estimate]   |   node tts.ts --voices
//   --voices    list the voices on the account (pick one for ELEVENLABS_VOICE_ID)
//   --estimate  no API call: estimate durations from text length (silent draft)
// Key and voice come from ../.env.local: ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID.
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { videos } from "./src/scripts/index.ts"

const here = import.meta.dirname
const envFile = path.join(here, "..", ".env.local")
if (fs.existsSync(envFile)) process.loadEnvFile(envFile)

const key = process.env.ELEVENLABS_API_KEY
const voice = process.env.ELEVENLABS_VOICE_ID
const API = "https://api.elevenlabs.io/v1"
const args = process.argv.slice(2)

function need(v: string | undefined, name: string): string {
  if (!v) throw new Error(`${name} is missing, add it to ${envFile}`)
  return v
}

if (args.includes("--voices")) {
  const res = await fetch(`${API}/voices`, { headers: { "xi-api-key": need(key, "ELEVENLABS_API_KEY") } })
  if (!res.ok) throw new Error(`voices: HTTP ${res.status} ${await res.text()}`)
  const { voices } = (await res.json()) as { voices: { voice_id: string; name: string; labels?: Record<string, string> }[] }
  for (const v of voices) console.log(`${v.voice_id}  ${v.name}  ${Object.values(v.labels ?? {}).join(", ")}`)
  process.exit(0)
}

const id = args.find((a) => !a.startsWith("--"))
const video = videos.find((v) => v.id === id)
if (!video) throw new Error(`usage: node tts.ts <${videos.map((v) => v.id).join("|")}> [--estimate]`)
const { scenes } = video
const durationsFile = path.join(here, "src", "durations", `${video.id}.json`)
const audioDir = path.join(here, "public", "audio", video.id)

const durations: Record<string, number> = {}
let audio = false

if (args.includes("--estimate")) {
  // shortcut: ~14 chars/s is a typical Turkish narration pace, replaced by real lengths once audio exists
  for (const s of scenes) durations[s.id] = Math.round((s.say.length / 14) * 10) / 10
} else {
  const apiKey = need(key, "ELEVENLABS_API_KEY")
  const voiceId = need(voice, "ELEVENLABS_VOICE_ID")
  fs.mkdirSync(audioDir, { recursive: true })
  const chars = scenes.reduce((n, s) => n + s.say.length, 0)
  console.log(`${scenes.length} scenes, ${chars} characters will be billed by ElevenLabs`)
  for (const s of scenes) {
    const file = path.join(audioDir, `${s.id}.mp3`)
    const res = await fetch(`${API}/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify({
        text: s.say,
        model_id: "eleven_turbo_v2_5",
        language_code: "tr", // forces Turkish reading on English-native voices (free plan has no Turkish library voices)
        voice_settings: { stability: 0.6, similarity_boost: 0.75, speed: 0.92 },
      }),
    })
    if (!res.ok) throw new Error(`${s.id}: HTTP ${res.status} ${await res.text()}`)
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()))
    const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" })
    durations[s.id] = Math.round(Number(out.trim()) * 10) / 10
    console.log(`${s.id}  ${durations[s.id]} s`)
  }
  audio = true
}

fs.writeFileSync(durationsFile, JSON.stringify({ audio, durations }, null, 2) + "\n")
console.log(`wrote ${path.relative(here, durationsFile)} (audio: ${audio})`)
