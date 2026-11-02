import type { CSSProperties, ReactNode } from "react"
import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion"
import { videos } from "./scripts/index.ts"
import type { AnswerVideo, Scene } from "./scripts/types.ts"

// Written by tts.ts; a question without a file yet falls back to 8 s per scene and no audio.
const timings = import.meta.webpackContext("./durations", { regExp: /\.json$/ })
type Timing = { audio: boolean; durations: Record<string, number> }
const timingOf = (id: string): Timing => (timings.keys().includes(`./${id}.json`) ? timings(`./${id}.json`) : { audio: false, durations: {} })

// Light, high-contrast palette.
const C = { bg: "#ffffff", ink: "#0b0f19", muted: "#3b4252", line: "#0b0f19", accent: "#1d4ed8", bad: "#b91c1c", good: "#047857", soft: "#eef2ff" }
const FONT = "Inter, 'Helvetica Neue', Arial, sans-serif"
export const FPS = 30
const PAD_S = 0.6 // breath after each scene's voice

const sceneFrames = (v: AnswerVideo, s: Scene) => Math.ceil(((timingOf(v.id).durations[s.id] ?? 8) + PAD_S) * FPS)
export const totalFrames = (v: AnswerVideo) => v.scenes.reduce((n, s) => n + sceneFrames(v, s), 0)

/** Fades and slides a child in at `at` frames. */
function In({ at, children, style }: { at: number; children: ReactNode; style?: CSSProperties }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const p = spring({ frame: frame - at, fps, config: { damping: 200 } })
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * 24}px)`, ...style }}>{children}</div>
}

/** Spreads n items over the first 75% of the scene so they land roughly while the voice mentions them. */
const stagger = (i: number, n: number, frames: number) => Math.round(12 + (i * frames * 0.75) / Math.max(n, 1))

function Box({ label, tone = C.ink, fill = C.bg, w = 420 }: { label: string; tone?: string; fill?: string; w?: number }) {
  return (
    <div style={{ width: w, padding: "28px 20px", border: `4px solid ${tone}`, borderRadius: 18, background: fill, color: tone, fontSize: 38, fontWeight: 700, textAlign: "center" }}>
      {label}
    </div>
  )
}

function Arrow({ progress, color = C.line, w = 160, broken = false }: { progress: number; color?: string; w?: number; broken?: boolean }) {
  return (
    <div style={{ position: "relative", width: w, height: 8 }}>
      <div style={{ position: "absolute", left: 0, top: 0, height: 8, width: w * progress, background: color, borderRadius: 4 }} />
      {progress > 0.98 && <div style={{ position: "absolute", right: -6, top: -12, borderLeft: `26px solid ${color}`, borderTop: "16px solid transparent", borderBottom: "16px solid transparent" }} />}
      {broken && progress > 0.98 && <div style={{ position: "absolute", left: w / 2 - 30, top: -46, fontSize: 80, fontWeight: 900, color: C.bad }}>×</div>}
    </div>
  )
}

function Lines({ lines, frames, start = 0, color = C.ink }: { lines: string[]; frames: number; start?: number; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {lines.map((l, i) => (
        <In key={l} at={start + stagger(i, lines.length, frames - start)}>
          <div style={{ fontSize: 44, color, display: "flex", gap: 20 }}>
            <span style={{ color: C.accent, fontWeight: 800 }}>›</span>
            <span>{l}</span>
          </div>
        </In>
      ))}
    </div>
  )
}

function Body({ s, frames }: { s: Scene; frames: number }) {
  const frame = useCurrentFrame()
  const grow = (from: number, len = 20) => interpolate(frame, [from, from + len], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })

  switch (s.kind) {
    case "title":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          <In at={0}><div style={{ fontSize: 34, color: C.accent, fontWeight: 700 }}>{s.sub}</div></In>
          <In at={6}><div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1.05 }}>{s.title}</div></In>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 20 }}>
            {s.facts.map((f, i) => (
              <In key={f} at={stagger(i, s.facts.length, frames) + 30}>
                <div style={{ border: `4px solid ${C.ink}`, borderRadius: 18, padding: "26px 30px", fontSize: 42, fontWeight: 700 }}>{f}</div>
              </In>
            ))}
          </div>
        </div>
      )
    case "trap":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
            <Box label={s.from} />
            <Arrow progress={grow(15)} w={260} color={C.bad} broken={frame > frames * 0.7} />
            <Box label={s.to} tone={C.bad} />
          </div>
          <Lines lines={s.lines} frames={frames} start={30} />
        </div>
      )
    case "local":
      return (
        <div style={{ display: "flex", gap: 80, alignItems: "center" }}>
          <In at={0}>
            <div style={{ width: 600, border: `4px solid ${C.ink}`, borderRadius: 22, padding: 30 }}>
              <div style={{ fontSize: 40, fontWeight: 800, marginBottom: 24 }}>{s.box}</div>
              <div style={{ border: `4px solid ${C.good}`, background: "#ecfdf5", borderRadius: 16, padding: 24, color: C.good, fontSize: 36, fontWeight: 700 }}>
                {s.inner}
                <div style={{ marginTop: 14, fontFamily: "Menlo, monospace", fontSize: 26, color: C.ink }}>{s.code}</div>
              </div>
            </div>
          </In>
          <div style={{ flex: 1 }}><Lines lines={s.lines} frames={frames} start={20} /></div>
        </div>
      )
    case "flow":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 90 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {s.steps.map((st, i) => {
              const at = stagger(i, s.steps.length, frames * 0.8)
              return (
                <div key={st} style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <In at={at}><Box label={st} w={300} tone={i === s.steps.length - 1 ? C.good : C.ink} /></In>
                  {i < s.steps.length - 1 && <Arrow progress={grow(at + 10)} w={70} />}
                </div>
              )
            })}
          </div>
          <In at={Math.round(frames * 0.65)}>
            <div style={{ background: C.soft, borderLeft: `10px solid ${C.accent}`, padding: "30px 36px", fontSize: 46, fontWeight: 700 }}>{s.note}</div>
          </In>
        </div>
      )
    case "hash": {
      const pct = frame > frames * 0.75 ? 20 : 10
      return (
        <div style={{ display: "flex", gap: 80, alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}><Lines lines={s.lines} frames={frames} /></div>
          <In at={20}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 52px)", gap: 8 }}>
              {Array.from({ length: 100 }, (_, i) => (
                <div key={i} style={{ width: 52, height: 52, borderRadius: 8, border: `3px solid ${C.ink}`, background: i < pct ? (i < 10 ? C.accent : C.good) : C.bg }} />
              ))}
            </div>
            <div style={{ fontSize: 40, fontWeight: 800, marginTop: 20, textAlign: "center" }}>%{pct} açık</div>
          </In>
        </div>
      )
    }
    case "bits": {
      const total = s.segments.reduce((n, g) => n + g.bits, 0)
      const tones = [C.muted, C.accent, C.good, C.bad]
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 60 }}>
          <div style={{ display: "flex", width: "100%", height: 150, border: `4px solid ${C.ink}`, borderRadius: 16, overflow: "hidden" }}>
            {s.segments.map((g, i) => (
              <div key={g.label} style={{ flex: Math.max(g.bits, 3) / total, opacity: grow(10 + i * 25), background: tones[i % tones.length], color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRight: i < s.segments.length - 1 ? `4px solid ${C.ink}` : undefined }}>
                <div style={{ fontSize: g.bits > 5 ? 40 : 24, fontWeight: 800 }}>{g.bits} bit</div>
                {g.bits > 5 && <div style={{ fontSize: 30, fontWeight: 600 }}>{g.label}</div>}
              </div>
            ))}
          </div>
          <Lines lines={s.lines} frames={frames} start={90} />
        </div>
      )
    }
    case "list":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {s.items.map((it, i) => (
            <In key={it} at={stagger(i, s.items.length, frames)}>
              <div style={{ fontSize: s.items.length > 5 ? 44 : 50, display: "flex", gap: 24, alignItems: "center" }}>
                <span style={{ width: 52, height: 52, borderRadius: 12, background: C.good, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 38, fontWeight: 900 }}>✓</span>
                <span style={{ fontWeight: 600 }}>{it}</span>
              </div>
            </In>
          ))}
        </div>
      )
  }
}

function SceneView({ v, s, index, frames }: { v: AnswerVideo; s: Scene; index: number; frames: number }) {
  const showTitle = s.kind !== "title"
  return (
    <AbsoluteFill style={{ background: C.bg, color: C.ink, fontFamily: FONT, padding: "90px 120px" }}>
      {showTitle && <In at={0}><div style={{ fontSize: 64, fontWeight: 800, marginBottom: 60 }}>{s.title}</div></In>}
      <Body s={s} frames={frames} />
      <div style={{ position: "absolute", left: 120, right: 120, bottom: 50, display: "flex", justifyContent: "space-between", fontSize: 26, color: C.muted, fontWeight: 600 }}>
        <span>dacospace · {v.title}</span>
        <span>{index + 1} / {v.scenes.length}</span>
      </div>
      {timingOf(v.id).audio && <Audio src={staticFile(`audio/${v.id}/${s.id}.mp3`)} />}
    </AbsoluteFill>
  )
}

export function Video({ id }: { id: string }) {
  const v = videos.find((x) => x.id === id)!
  let from = 0
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {v.scenes.map((s, i) => {
        const frames = sceneFrames(v, s)
        const seq = (
          <Sequence key={s.id} from={from} durationInFrames={frames}>
            <SceneView v={v} s={s} index={i} frames={frames} />
          </Sequence>
        )
        from += frames
        return seq
      })}
    </AbsoluteFill>
  )
}
