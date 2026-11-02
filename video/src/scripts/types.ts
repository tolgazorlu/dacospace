// `say` is what ElevenLabs reads (numbers spelled out so the voice reads them right),
// everything else is what the screen shows. Plain Turkish, only unavoidable terms in English.
export type Scene =
  | { id: string; kind: "title"; say: string; title: string; sub: string; facts: string[] }
  | { id: string; kind: "trap"; say: string; title: string; from: string; to: string; lines: string[] }
  | { id: string; kind: "local"; say: string; title: string; box: string; inner: string; code: string; lines: string[] }
  | { id: string; kind: "flow"; say: string; title: string; steps: string[]; note: string }
  | { id: string; kind: "hash"; say: string; title: string; lines: string[] }
  | { id: string; kind: "bits"; say: string; title: string; segments: { bits: number; label: string }[]; lines: string[] }
  | { id: string; kind: "list"; say: string; title: string; items: string[] }

export type AnswerVideo = { id: string; title: string; scenes: Scene[] }
