# Hint figures

Interactive figures that show where a question's problem comes from, opened by the "Show a hint" button
on the question page. Built with the [Anatomy](https://github.com/wheresryan22/anatomy) kit
(`kit/iso-kit.mjs`, MIT, see `kit/LICENSE`).

- `figures/<id>/build.mjs` writes `public/figures/<id>/<lang>-<theme>.html` (en/tr x dark/light).
  Rebuild after any change: `node figures/<id>/build.mjs`.
- The question page shows the button only when `public/figures/<id>/` exists.
- The numbers live in `figures/<id>/model.mjs`; the caption states the assumptions.
- A hint shows the cause, never the fix: the answer is still the user's job.
