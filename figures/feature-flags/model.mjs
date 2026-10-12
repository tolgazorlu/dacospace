// The numbers behind Fig 1 (feature flag question). Stated assumptions, shown in the caption:
// every flag check is a network call to one flag service, served as an M/M/1 queue.
//   round trip 0.5 ms, capacity 60,000 checks/s, p99 sojourn = ln(100) / (capacity - load).
// Today's traffic (50,000 checks/s) and the 1 ms budget come from the question itself.

export const CAPACITY = 60000
export const TODAY = 50000
export const MAX_LOAD = 70000
export const BUDGET_MS = 1

/** p99 time of one flag check in ms; Infinity once the load reaches the capacity. */
export function p99(load) {
  const ROUND_TRIP_MS = 0.5
  const CAP = 60000
  if (load >= CAP) return Infinity
  return ROUND_TRIP_MS + (Math.log(100) / (CAP - load)) * 1000
}
