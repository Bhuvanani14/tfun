# TFun – Telugu cinema trivia

Static, no-build web app. Run locally: `npx serve public -l 5173`.

## Adding a quiz pack
Edit `public/data/packs.json`: add a pack to `packs` and questions to `questions`.
Each question carries `license {type, source, permission}`, `lang`, `answer`, `difficulty` (1-3) and `spoiler` (0-2).
Only use `"type":"licensed"` (with an `audio` path) when you hold written permission. Never scrape dialogue or audio.
The shipped set is 100% original clues; the narrator is device text-to-speech and is labelled as original.

## Privacy
Preferences and progress live in localStorage. No server calls, no API keys.

## Deploy on Render
Push this folder to GitHub, then Render > New > Blueprint (uses `render.yaml`) or New > Static Site with publish dir `public`.
