# Answer videos

Turkish walkthrough videos of daily questions: Remotion for the motion, ElevenLabs for the voice.

1. Script: `src/scripts/<question-id>.ts` (`say` is read aloud, the rest is on screen), registered in `src/scripts/index.ts`.
2. Voice: `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` in `../.env.local`, then `pnpm tts <question-id>`
   (`pnpm voices` lists voices, `pnpm tts <question-id> --estimate` makes a silent draft without API calls).
3. Preview: `pnpm studio`. Render: `pnpm render <question-id>` -> `out/<question-id>.mp4`.
