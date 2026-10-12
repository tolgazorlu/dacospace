/**
 * Hosted mode is the public demo (Vercel sets VERCEL=1). The server writes nothing and spawns
 * nothing: the interview question follows from the date, answers stay in the visitor's browser,
 * and the lab, the AI lab and their APIs are off.
 */
export const isHosted = () => process.env.DACOSPACE_HOSTED === "1" || process.env.VERCEL === "1"
