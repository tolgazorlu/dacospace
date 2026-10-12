// Fig 1 for the feature flag question: why "ask the flag service on every request" breaks.
// Built with the Anatomy kit (MIT, figures/kit). Writes public/figures/feature-flags/<lang>-<theme>.html.
//   node figures/feature-flags/build.mjs
// The model in model.mjs drives the needle, the lamps and the readout; the caption states its assumptions.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import * as k from "../kit/iso-kit.mjs"
import { CAPACITY, MAX_LOAD, TODAY, p99 } from "./model.mjs"

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, "..", "..", "public", "figures", "feature-flags")
const kitScript = () => readFileSync(join(HERE, "..", "kit", "iso-kit.mjs"), "utf8").replace(/^export /gm, "")

const WIDTH = 600
const HEIGHT = 380

// World layout, about 1 unit per px of the real bench.
const PLATE = { x: -158, y: -86, w: 316, d: 172, r: 8 }
const PLATE_H = 12
const FOOT_H = 5

const CAB = { x: -148, y: -34, w: 122, d: 106, r: 4 } // the line cabinet: 30 app servers
const CAB_PLINTH = 5
const CAB_TOP = 20
const COLS = 6
const ROWS = 5
const LAMP_X = (i) => -134 + i * 19.4
const LAMP_Y = (j) => -17 + j * 19.6
const LAMPS = []
for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) LAMPS.push([LAMP_X(i), LAMP_Y(j)])

const EX = { x: 22, y: -74, w: 114, d: 86, r: 4 } // the exchange: the one flag service
const EX_PLINTH = 5
const EX_TOP = 42
const EX_FRONT = EX.y + EX.d // y of the front face
const JACK = [62, EX_FRONT, 22] // where every cord ends

const DIAL = [64, -32]
const DIAL_R = 27
const DIAL_Z = EX_TOP
const DIAL_H = 8
const DIAL_TOP = DIAL_Z + DIAL_H
const SCALE_MAX = 3 // ms at the end of the dial
const SWEEP = (Math.PI * 3) / 2 // 270° of scale
const FROM = -SWEEP / 2

const SWITCH = [114, -36]

const RAIL = { x: 30, y: 52, w: 106, d: 11, r: 1.4 } // load scale on the base, in front of the exchange
const RAIL_H = 2
const JUNCTION = { x: 4, y: -26, w: 11, d: 92, r: 1.6 } // terminal strip: five row cords in, one trunk out
const JUNCTION_H = 7
const RAIL_FROM = RAIL.x + 4
const RAIL_TO = RAIL.x + RAIL.w - 4
const xOfLoad = (load) => RAIL_FROM + (load / MAX_LOAD) * (RAIL_TO - RAIL_FROM)

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), ...k.boxCorners(EX, 0, DIAL_TOP + 2), [SWITCH[0], SWITCH[1], EX_TOP + 22]],
  WIDTH,
  HEIGHT,
  { pad: 28, azimuth: 38 },
)

const at = (p) => k.iso(p, P)
const S = (paths, style) => k.solidSvg(paths, style)
const L = (d, style) => k.lineSvg(d, style)
const D = (points, style) => k.dotsSvg(points, style)
const byDepth = (points, z = 0) => [...points].sort((a, b) => k.depthOf([a[0], a[1], z], P) - k.depthOf([b[0], b[1], z], P))

function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`]
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }))
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }))
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }))
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }))
  const screws = k.corners(PLATE, 10)
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }))
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }))
  // label plate, front left
  const label = { x: -20, y: 70, w: 40, d: 11, r: 1.2 }
  out.push(S(k.slabOf(label, 0, 0.8, P, 3), { tone: "lo", crease: "none" }))
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 3), { tone: "faint" }))
  for (const [y, w] of [[73.4, 26], [75.8, 18], [78.2, 22]]) out.push(L(k.lineOnTop([label.x + 6, y], [label.x + 6 + w, y], 0.8, P), { tone: "lo", free: true }))
  out.push(D([at([label.x + 3, label.y + label.d / 2, 0.8]), at([label.x + label.w - 3, label.y + label.d / 2, 0.8])], { size: 0.45 }))
  return out.join("")
}

function rail() {
  const out = []
  out.push(S(k.slabOf(RAIL, 0, RAIL_H, P, 3, 0.4), { tone: "lo", crease: "lo" }))
  // one minor tick per 1,000 checks/s, a major every 10,000; today's traffic and the capacity in hi
  const minor = []
  const major = []
  const strong = []
  for (let load = 0; load <= MAX_LOAD; load += 1000) {
    const x = xOfLoad(load)
    const len = load % 10000 === 0 ? 3.8 : 2
    const line = k.lineOnTop([x, RAIL.y], [x, RAIL.y + len], RAIL_H, P)
    if (load === TODAY || load === CAPACITY) strong.push(k.lineOnTop([x, RAIL.y], [x, RAIL.y + 6], RAIL_H, P))
    else (load % 10000 === 0 ? major : minor).push(line)
  }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }), L(strong.join(""), { tone: "hi", free: "end" }))
  out.push(D([at([RAIL.x + 2, RAIL.y + RAIL.d / 2, RAIL_H]), at([RAIL.x + RAIL.w - 2, RAIL.y + RAIL.d / 2, RAIL_H])], { size: 0.45 }))
  // the two end stops
  for (const x of [RAIL.x - 4, RAIL.x + RAIL.w]) {
    out.push(S(k.slabOf({ x, y: RAIL.y - 1, w: 4, d: RAIL.d + 2, r: 1 }, 0, 5, P, 3, 0.4), { tone: "mid" }))
    out.push(D([at([x + 2, RAIL.y + RAIL.d / 2, 5])], { size: 0.45 }))
  }
  return out.join("")
}

// The rider that sets the load: built at x = 0, moved with translateAlong.
function rider() {
  const out = []
  const body = { x: -6, y: RAIL.y + RAIL.d - 1, w: 12, d: 8, r: 1.4 }
  out.push(S(k.slabOf(body, 0, 7, P, 3, 0.5), { tone: "mid" }))
  out.push(D([at([body.x + 2, body.y + body.d - 2, 7]), at([body.x + body.w - 2, body.y + body.d - 2, 7])], { size: 0.45 }))
  out.push(S(k.slabOf({ x: -1.6, y: RAIL.y - 0.5, w: 3.2, d: RAIL.d + 0.5, r: 0.6 }, RAIL_H, 1.6, P, 2), { tone: "hi", crease: "lo" }))
  out.push(L(k.lineOnTop([0, RAIL.y - 0.5], [0, RAIL.y + RAIL.d], RAIL_H + 1.6, P), { tone: "hi" }))
  out.push(S(k.cylinder(0, body.y + body.d + 3.4, 3.4, 1, 5.4, P, 24), { tone: "mid" }))
  out.push(L(k.knurl(0, body.y + body.d + 3.4, 3.4, 1, 6.4, 22, P), { tone: "lo" }))
  return out.join("")
}

function cabinet() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(CAB, 4), 0, 0.1, P)}" style="filter:blur(3px)"/>`]
  out.push(S(k.slabOf(CAB, 0, CAB_PLINTH, P, 4, 0.6), { tone: "mid" }))
  const body = k.insetPlan(CAB, 2.5)
  out.push(S(k.slabOf(body, CAB_PLINTH, CAB_TOP - CAB_PLINTH, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(body, CAB_PLINTH + 7, P, 4), { tone: "faint" }) }))
  out.push(L(k.planOutline(k.insetPlan(body, 4), CAB_TOP, P, 3), { tone: "faint" }))
  out.push(D(k.corners(body, 6.5).map(([x, y]) => at([x, y, CAB_TOP])), { size: 0.5 }))
  // the row terminals on the right face, where the cords leave
  for (let j = 0; j < ROWS; j++) {
    const y = LAMP_Y(j)
    const block = { x: body.x + body.w, y: y - 3, w: 3, d: 6, r: 0.8 }
    out.push(S(k.slabOf(block, 8, 6, P, 2, 0.3), { tone: "mid" }))
    out.push(D([at([block.x + 3, y, 11])], { size: 0.55, tone: "hi" }))
  }
  return out.join("")
}

function lampSocket([x, y]) {
  return S(k.cylinder(x, y, 6, CAB_TOP, 1.4, P, 28), { tone: "mid" }) + L(k.ring(x, y, 4.6, CAB_TOP + 1.4, P, 24), { tone: "lo" })
}

// The lens of each lamp: two variants stacked, the live code shows one.
function lamp([x, y], index) {
  const off = S(k.cylinder(x, y, 3.6, CAB_TOP + 1.4, 1.6, P, 24), { tone: "lo", crease: "lo" })
  const on =
    S(k.cylinder(x, y, 3.6, CAB_TOP + 1.4, 1.6, P, 24), { tone: "hi", lit: true }) +
    `<path class="ff-glow" d="${k.ring(x, y, 2.9, CAB_TOP + 3, P, 24)}"/>`
  return `<g data-lamp="${index}"><g data-off>${off}</g><g data-on style="display:none">${on}</g></g>`
}

function exchange() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(EX, 4), 0, 0.1, P)}" style="filter:blur(3px)"/>`]
  out.push(S(k.slabOf(EX, 0, EX_PLINTH, P, 4, 0.6), { tone: "mid" }))
  const body = k.insetPlan(EX, 2.5)
  out.push(S(k.slabOf(body, EX_PLINTH, EX_TOP - EX_PLINTH, P, 4, 1), {
    tone: "hi",
    crease: "lo",
    inner: L(k.sideSeam(body, EX_TOP - 6, P, 4) + k.sideSeam(body, EX_PLINTH + 6, P, 4), { tone: "faint" }),
  }))
  out.push(L(k.planOutline(k.insetPlan(body, 4), EX_TOP, P, 3), { tone: "faint" }))
  out.push(D(k.corners(body, 6.5).map(([x, y]) => at([x, y, EX_TOP])), { size: 0.5 }))
  // vents on the right face: closed slots
  // jack plate on the front face, with the single jack every cord ends in
  const plate = { x: JACK[0] - 13, y: EX_FRONT - 2.5, w: 26, d: 3.5, r: 0.8 }
  out.push(S(k.slabOf(plate, JACK[2] - 9, 18, P, 2, 0.4), { tone: "mid" }))
  out.push(D([at([plate.x + 2.4, plate.y + plate.d, JACK[2] + 7]), at([plate.x + plate.w - 2.4, plate.y + plate.d, JACK[2] + 7])], { size: 0.45 }))
  out.push(L(k.sideRing([JACK[0], plate.y + plate.d, JACK[2]], 3.2, "y", P), { tone: "mid" }))
  out.push(L(k.sideRing([JACK[0], plate.y + plate.d, JACK[2]], 1.6, "y", P), { tone: "hi" }))
  return out.join("")
}

function dial() {
  const out = []
  const [x, y] = DIAL
  out.push(S(k.cylinder(x, y, DIAL_R + 3, DIAL_Z, 2, P, 64, 0.5), { tone: "mid" }))
  out.push(S(k.cylinder(x, y, DIAL_R, DIAL_Z + 2, DIAL_H - 2, P, 64, 0.8), { tone: "hi", crease: "lo" }))
  out.push(L(k.knurl(x, y, DIAL_R, DIAL_TOP - 3.4, DIAL_TOP, 84, P, 0.3), { tone: "lo" }))
  out.push(L(k.sideArc(x, y, DIAL_R, DIAL_TOP - 3.4, P, 40), { tone: "faint" }))
  out.push(L(k.ring(x, y, DIAL_R - 2.2, DIAL_TOP, P, 64), { tone: "lo" }))
  // 0 to 3 ms in 0.1 ms steps, a major every 1 ms; the 1 ms budget mark in hi
  const ticks = k.radialTicks(x, y, DIAL_R - 3, 30, 10, DIAL_TOP, [1.3, 2.8], P, FROM, SWEEP * (30 / 30))
  out.push(L(ticks.minor, { tone: "mid" }), L(ticks.major, { tone: "hi" }))
  const budget = FROM + SWEEP * (1 / SCALE_MAX)
  out.push(L(k.lineOnTop([x + Math.sin(budget) * (DIAL_R - 3), y - Math.cos(budget) * (DIAL_R - 3)], [x + Math.sin(budget) * (DIAL_R - 8), y - Math.cos(budget) * (DIAL_R - 8)], DIAL_TOP, P), { tone: "hi" }))
  out.push(L(k.ring(x, y, 1.8, DIAL_TOP, P, 16), { tone: "mid" }))
  out.push(k.faceTextSvg(k.topMatrix([x, y + 10], DIAL_TOP, P, "x"), "ms", { size: 2.6, tone: "lo", anchor: "middle" }))
  // crown on the right
  out.push(S(k.slabOf({ x: x + DIAL_R - 1, y: y - 2.4, w: 5, d: 4.8, r: 1.2 }, DIAL_Z + 2.4, 4, P, 3), { tone: "mid" }))
  return out.join("")
}

const needleAt = (ms) => {
  const share = Math.min(ms, SCALE_MAX * 1.04) / SCALE_MAX
  const angle = FROM + SWEEP * share
  const [x, y] = DIAL
  return k.lineOnTop([x - Math.sin(angle) * 3.6, y + Math.cos(angle) * 3.6], [x + Math.sin(angle) * (DIAL_R - 4), y - Math.cos(angle) * (DIAL_R - 4)], DIAL_TOP + 0.2, P)
}

function switchBase() {
  const out = []
  const [x, y] = SWITCH
  const plinth = { x: x - 11, y: y - 16, w: 22, d: 32, r: 2 }
  out.push(S(k.slabOf(plinth, EX_TOP, 3, P, 3, 0.5), { tone: "mid" }))
  out.push(D(k.corners(plinth, 2.6).map(([px, py]) => at([px, py, EX_TOP + 3])), { size: 0.45 }))
  // hinge posts either side of the lever
  for (const dx of [-6, 3.5]) out.push(S(k.slabOf({ x: x + dx, y: y + 6, w: 2.5, d: 6, r: 0.6 }, EX_TOP + 3, 8, P, 2, 0.3), { tone: "mid" }))
  // the contact clip the lever drops into
  for (const dx of [-3.6, 1.6]) out.push(S(k.slabOf({ x: x + dx, y: y - 13, w: 2, d: 5, r: 0.5 }, EX_TOP + 3, 6, P, 2, 0.3), { tone: "mid" }))
  return out.join("")
}

// The knife-switch lever: closed (lying in its clip) when the service is up, raised when it is cut.
const leverAt = (open) => {
  const [x, y] = SWITCH
  const pivot = [x, y + 9, EX_TOP + 9]
  const tilt = open ? 1.1 : 0.1
  const len = 21
  const tip = [x, pivot[1] - Math.cos(tilt) * len, pivot[2] + Math.sin(tilt) * len]
  const handle = [x, tip[1] - Math.cos(tilt) * 5, tip[2] + Math.sin(tilt) * 5]
  return { blade: k.segment(pivot, tip, P), grip: k.segment(tip, handle, P), knob: at(handle) }
}

// The junction block on the bench: five row cords come in on top, one trunk leaves its front face.
function junction() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(JUNCTION, 2), 0, 0.1, P)}" style="filter:blur(2px)"/>`]
  out.push(S(k.slabOf(JUNCTION, 0, JUNCTION_H, P, 3, 0.5), { tone: "mid" }))
  out.push(L(k.planOutline(k.insetPlan(JUNCTION, 2.4), JUNCTION_H, P, 3), { tone: "faint" }))
  out.push(D(k.corners(JUNCTION, 2.4).map(([x, y]) => at([x, y, JUNCTION_H])), { size: 0.45 }))
  // five terminal posts on top, one per row
  for (let j = 0; j < ROWS; j++) {
    const [x, y] = [JUNCTION.x + 4, LAMP_Y(j)]
    out.push(S(k.cylinder(x, y, 1.3, JUNCTION_H, 1.4, P, 16), { tone: "mid" }))
  }
  return out.join("")
}

// Five row cords: each drops from its row terminal to the bench and runs straight to the strip. They are
// drawn before the strip, since they climb its far face; leads() draws the part on its top after it.
function cords() {
  return Array.from({ length: ROWS }, (_, j) => {
    const y = LAMP_Y(j)
    const face = CAB.x + CAB.w - 2.5 + 3
    const via = [at([face + 3, y, 11]), at([face + 3, y, 1]), at([JUNCTION.x - 1.2, y, 1])]
    return `<g data-cord="${j}">${k.wireSvg(at([face, y, 11]), at([JUNCTION.x - 0.2, y, JUNCTION_H - 0.4]), { via, tone: "hi", ends: "from", size: 0.9 })}</g>`
  }).join("")
}

function leads() {
  return Array.from({ length: ROWS }, (_, j) => {
    const y = LAMP_Y(j)
    return k.wireSvg(at([JUNCTION.x, y, JUNCTION_H]), at([JUNCTION.x + 4, y, JUNCTION_H + 1.4]), { tone: "hi", ends: "to", size: 0.9 })
  }).join("")
}

// The trunk: one cable from the junction's right face into the exchange's single jack.
function trunk() {
  const from = [JUNCTION.x + JUNCTION.w, 30, 3.5]
  const via = [
    at([from[0] + 6, from[1], 1]),
    at([JACK[0] - 8, from[1], 1]),
    at([JACK[0], from[1] - 8, 1]),
    at([JACK[0], EX_FRONT + 3, 4]),
    at([JACK[0], EX_FRONT + 2, JACK[2] - 5]),
  ]
  return `<g class="ff-trunk">${k.wireSvg(at(from), at([JACK[0], EX_FRONT + 1, JACK[2]]), { via, tone: "hi", ends: "both", size: 1.4 })}</g>`
}

const TEXT = {
  en: {
    title: "Every check asks one service",
    hint: "Hover: load · click: cut",
    label:
      "A switchboard on a bench. Thirty lamps on the left cabinet are thirty app servers; five cords carry every flag check into the single jack of the exchange on the right. A dial on the exchange reads the p99 time of one check against a 1 ms budget mark, a rider on the front scale sets the checks per second, and a knife switch cuts the exchange.",
    keys: [
      { mark: "lit", label: "App servers waiting on an answer" },
      { mark: "raised", label: "The flag service: one exchange, one jack" },
    ],
    caption: `Asking the service on every request puts a network round trip and a shared queue on the hot path. Assumed here: 0.5 ms round trip, one service that answers ${CAPACITY.toLocaleString("en-US")} checks/s, and an M/M/1 queue, so p99 = 0.5 ms + ln(100)/(capacity − load). At today's ${TODAY.toLocaleString("en-US")} checks/s it sits just under 1 ms; a little more traffic crosses it, and cutting the service stops every server.`,
    aria: "Load in checks per second. Arrow keys change it, Space cuts or restores the service.",
    num: (n) => n.toLocaleString("en-US"),
    ms: (v) => v.toFixed(2),
    up: (load, ms) => `${(load / 1000).toFixed(0)}k/s · p99 ${ms} ms${Number(ms) <= 1 ? "" : " · over budget"}`,
    sat: (load) => `${(load / 1000).toFixed(0)}k/s · queue never drains`,
    down: "down · 30 of 30 waiting",
  },
  tr: {
    title: "Her kontrol tek servise soruyor",
    hint: "Gez: yük · tıkla: kes",
    label:
      "Tezgâh üzerinde bir telefon santrali. Soldaki dolaptaki otuz lamba otuz uygulama sunucusu; beş kablo her flag kontrolünü sağdaki santralin tek jakına taşıyor. Santralin üstündeki kadran bir kontrolün p99 süresini 1 ms bütçe işaretine göre gösteriyor, öndeki cetvel üzerindeki sürgü saniyedeki kontrol sayısını ayarlıyor, bir bıçaklı şalter de santrali kesiyor.",
    keys: [
      { mark: "lit", label: "Cevap bekleyen uygulama sunucuları" },
      { mark: "raised", label: "Flag servisi: tek santral, tek jak" },
    ],
    caption: `Her request'te servise sormak hot path'e bir network round trip'i ve paylaşılan bir kuyruk ekler. Varsayımlar: 0,5 ms round trip, saniyede ${CAPACITY.toLocaleString("tr-TR")} kontrol cevaplayabilen tek bir servis ve M/M/1 kuyruğu; yani p99 = 0,5 ms + ln(100)/(kapasite − yük). Bugünkü saniyede ${TODAY.toLocaleString("tr-TR")} kontrolde 1 ms'nin hemen altında; biraz daha trafik bütçeyi aşar, servisi kesmek de bütün sunucuları durdurur.`,
    aria: "Saniyedeki kontrol sayısı. Ok tuşları değiştirir, boşluk tuşu servisi keser ya da geri açar.",
    num: (n) => n.toLocaleString("tr-TR"),
    ms: (v) => v.toFixed(2).replace(".", ","),
    up: (load, ms) => `${(load / 1000).toFixed(0)}k/sn · p99 ${ms} ms${Number(ms.replace(",", ".")) <= 1 ? "" : " · bütçe aşıldı"}`,
    sat: (load) => `${(load / 1000).toFixed(0)}k/sn · kuyruk hiç boşalmıyor`,
    down: "servis yok · 30 sunucu bekliyor",
  },
}

function page(lang, theme) {
  const t = TEXT[lang]
  const lever = leverAt(false)
  const svg = k.figureSvg({
    width: WIDTH,
    height: HEIGHT,
    label: t.label,
    body: [
      base(),
      cabinet(),
      byDepth(LAMPS, CAB_TOP).map(lampSocket).join(""),
      `<g data-part="lamps">${byDepth(LAMPS, CAB_TOP).map((p) => lamp(p, LAMPS.indexOf(p))).join("")}</g>`,
      `<g class="ff-cords">${cords()}</g>`,
      junction(),
      `<g class="ff-cords">${leads()}</g>`,
      exchange(),
      dial(),
      `<path data-part="needle" class="iso-line" data-tone="lit" data-free d="${needleAt(p99(TODAY))}" style="stroke-width:1.1"/>`,
      switchBase(),
      `<g data-part="lever"><path class="iso-line" data-tone="hi" d="${lever.blade}" style="stroke-width:2"/><path class="iso-line" data-tone="mid" d="${lever.grip}" style="stroke-width:3.2"/><circle class="iso-wire-end" cx="${lever.knob[0].toFixed(1)}" cy="${lever.knob[1].toFixed(1)}" r="2"/></g>`,
      `<g class="ff-cords">${trunk()}</g>`,
      rail(),
      `<g data-part="rider" transform="${k.translateAlong(P, [xOfLoad(TODAY), 0, 0])}">${rider()}</g>`,
    ],
  })
  const startMs = t.ms(p99(TODAY))
  const live = `
const P = ${JSON.stringify(P)};
const T = { up: ${t.up.toString()}, sat: ${t.sat.toString()}, down: ${JSON.stringify(t.down)}, ms: ${t.ms.toString()} };
const CAPACITY = ${CAPACITY}, MAX_LOAD = ${MAX_LOAD}, TODAY = ${TODAY}, LAMPS = ${LAMPS.length};
const p99 = ${p99.toString()};
const DIAL = ${JSON.stringify(DIAL)}, DIAL_R = ${DIAL_R}, DIAL_TOP = ${DIAL_TOP}, SCALE_MAX = ${SCALE_MAX}, SWEEP = ${SWEEP}, FROM = ${FROM};
const SWITCH = ${JSON.stringify(SWITCH)}, EX_TOP = ${EX_TOP};
const RAIL_FROM = ${RAIL_FROM}, RAIL_TO = ${RAIL_TO};
const needleAt = ${needleAt.toString().replace(/k\.lineOnTop/g, "lineOnTop")};
const leverAt = ${leverAt.toString().replace(/k\.segment/g, "segment").replace(/\bat\(/g, "iso(").replace("iso(handle)", "iso(handle, P)")};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const needle = svg.querySelector('[data-part="needle"]');
const rider = svg.querySelector('[data-part="rider"]');
const lever = svg.querySelector('[data-part="lever"]');
const cords = [...svg.querySelectorAll(".ff-cords")];
const lamps = [...svg.querySelectorAll("[data-lamp]")].sort((a, b) => a.dataset.lamp - b.dataset.lamp);
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const xOf = (load) => RAIL_FROM + (load / MAX_LOAD) * (RAIL_TO - RAIL_FROM);
let load = TODAY, target = TODAY, down = false, shownMs = p99(TODAY), open = 0, openTarget = 0;
let frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idle = 0, shuffle = 0, order = lamps.map((_, i) => i);
const TOUR = [[TODAY, false, 2.6], [12000, false, 2.2], [TODAY, false, 2.2], [58000, false, 2.4], [TODAY, false, 1.6], [TODAY, true, 2.8]];
const TOUR_LEN = TOUR.reduce((s, x) => s + x[2], 0);
function tourAt(t) { let s = t % TOUR_LEN; for (const step of TOUR) { if (s < step[2]) return step; s -= step[2]; } return TOUR[0]; }
function lampsLit() {
  if (down) return LAMPS;
  const rho = Math.min(1, load / CAPACITY);
  return Math.round(rho * LAMPS);
}
function draw(dt) {
  rider.setAttribute("transform", translateAlong(P, [xOf(load), 0, 0]));
  needle.setAttribute("d", needleAt(shownMs));
  const l = leverAt(open > 0.5);
  const paths = lever.querySelectorAll("path");
  paths[0].setAttribute("d", l.blade); paths[1].setAttribute("d", l.grip);
  const knob = lever.querySelector("circle"); knob.setAttribute("cx", l.knob[0].toFixed(1)); knob.setAttribute("cy", l.knob[1].toFixed(1));
  shuffle -= dt;
  if (shuffle <= 0) {
    shuffle = still.matches ? 1e9 : 0.16;
    if (!down) for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  }
  const n = lampsLit();
  lamps.forEach((el, i) => { const on = order.indexOf(i) < n; el.querySelector("[data-on]").style.display = on ? "" : "none"; el.querySelector("[data-off]").style.display = on ? "none" : ""; });
  for (const c of cords) c.style.opacity = down ? "0.35" : "";
  const ms = p99(load);
  const text = down ? T.down : ms === Infinity ? T.sat(load) : T.up(load, T.ms(ms));
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(load)));
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) { clock += dt; const step = tourAt(clock); target = step[0]; down = step[1]; }
  load = calm ? target : load + (target - load) * (1 - Math.exp(-dt / 0.35));
  if (Math.abs(target - load) < 20) load = target;
  openTarget = down ? 1 : 0;
  open = calm ? openTarget : open + (openTarget - open) * (1 - Math.exp(-dt / 0.12));
  const wantMs = down ? SCALE_MAX * 1.04 : Math.min(p99(load), SCALE_MAX * 1.04);
  shownMs = calm ? wantMs : shownMs + (wantMs - shownMs) * (1 - Math.exp(-dt / 0.25));
  draw(dt);
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 3600); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const share = clamp(((event.clientX - box.left) / box.width - 0.2) / 0.6, 0, 1);
  target = Math.round((share * MAX_LOAD) / 1000) * 1000;
  hold();
});
stage.addEventListener("click", () => { down = !down; hold(); });
stage.addEventListener("keydown", (event) => {
  const step = event.shiftKey ? 10000 : 1000;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") target = clamp(target + step, 0, MAX_LOAD);
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") target = clamp(target - step, 0, MAX_LOAD);
  else if (event.key === " " || event.key === "Enter") down = !down;
  else if (event.key === "Home") target = 0;
  else if (event.key === "End") target = MAX_LOAD;
  else return;
  event.preventDefault();
  hold();
});
const report = () => parent !== window && parent.postMessage({ dacospaceFigure: document.documentElement.scrollHeight }, "*");
new ResizeObserver(report).observe(document.body);
draw(0);
`
  const body = k.plateHtml({
    fig: "Fig 1",
    title: t.title,
    hint: t.hint,
    readout: t.up(TODAY, startMs),
    keys: t.keys,
    caption: t.caption,
    body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="${t.aria}" aria-valuemin="0" aria-valuemax="${MAX_LOAD}" aria-valuenow="${TODAY}">${svg}</div>`,
  })
  const html = k
    .pageHtml({ title: t.title, theme, body, script: kitScript() + live, width: 640 })
    .replace('<html lang="en">', `<html lang="${lang}">`)
    .replace("</style>", ".iso-page{margin:0 auto!important;width:100%!important}body{background:transparent!important}.iso-stage{cursor:pointer;outline:none}.ff-cords{transition:opacity .3s}.ff-cords .iso-line{stroke-width:.8}.ff-trunk .iso-line{stroke-width:2.2}.ff-glow{fill:var(--anatomy-lit);opacity:.9}</style>")
  return html
}

mkdirSync(OUT, { recursive: true })
for (const lang of ["en", "tr"]) {
  for (const theme of ["dark", "light"]) {
    const file = join(OUT, `${lang}-${theme}.html`)
    writeFileSync(file, page(lang, theme))
    console.log("wrote", file.replace(join(HERE, "..", "..") + "/", ""))
  }
}
