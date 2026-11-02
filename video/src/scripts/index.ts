import { featureFlags } from "./feature-flags.ts"
import { uniqueIdGenerator } from "./unique-id-generator.ts"
import { pastebin } from "./pastebin.ts"

/** One entry per daily question that has an answer video, in day order. */
export const videos = [featureFlags, uniqueIdGenerator, pastebin]
