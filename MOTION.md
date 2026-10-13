# Motion studio

Code-rendered motion graphics for STKD: product reels for Reels and TikTok, and the looping hero video on the website. Claude doesn't "make a video". It writes a scene that paints any single frame from a time `t`. A headless browser captures every frame, and FFmpeg stitches them, with a soundtrack synthesized from code, into an MP4.

## Setup

Requires Node 20+, FFmpeg and Chromium (Playwright).

```sh
npm install
npx playwright install chromium   # skip if Chromium is already available; or set CHROMIUM_PATH
ffmpeg -version                   # macOS: brew install ffmpeg · Windows: winget install ffmpeg
```

## Render

```sh
# 9:16 reel with sound
npm run render -- --scene drop-reveal --size 1080x1920 --out out/drop-reveal-9x16.mp4

# 4:5 website hero loop: no captions, no audio, plus a poster frame
npm run render -- --scene drop-reveal --size 1080x1350 --captions 0 --mute \
  --out site/media/drop-reveal-4x5.mp4 --poster 6.9

# Stills at chosen times, for quick checks
npm run render -- --scene drop-reveal --size 1080x1350 --out out/check.mp4 --only 0,2.5,6.9
```

## Rules for scenes

These rules keep the output from looking like generic AI motion:

1. **Frames are pure.** `SCENE.render(t)` sets every style from `t` alone. There are no CSS transitions, keyframes, `setTimeout` or `requestAnimationFrame` in scenes. `scene.css` disables transitions and animations outright.
2. **Real spring physics.** All motion comes from the closed-form spring in `site/js/motion.js` (`spring`, `springInOut`, `SPRINGS` presets). Don't use easing keywords or `cubic-bezier`.
3. **Cut to the beat.** Each scene sets a BPM, and every timeline value is `at(beat)`. Sound cues in `SCENE.cues` use the same grid, so hits land on cuts.
4. **Sound is synthesized in code** (`motion/synth.mjs`): beat, bass, risers, impacts, ticks and whooshes, all generated from the scene's BPM and cues. Nothing is licensed or downloaded.
5. **Real references, not slop.** Show actual products and numbers (counts, flavours, price) taken from the STKD Packs plan. Captions are sentence case and left-aligned, never all-caps text centred on a gradient. Colours and fonts come only from `site/tokens.css`.
6. **Loop seamlessly.** The last frame must match the first.

## Critique loop

After every render:

```sh
npm run critique -- out/drop-reveal-9x16.mp4
```

This flags **dead frames** (stretches over 0.35 s where nothing moves) and exports one still per beat plus a contact sheet to `out/critique/<name>/`. Claude then looks at the sheet and grades each beat out of 10 for:

- Hierarchy: one clear message per beat.
- Motion: something alive in every beat, with springs that settle cleanly.
- Legibility at phone size.
- Brand fidelity: tokens, real product facts, chrome box.
- Value clarity: variety and price are obvious.

Fix every beat that scores below 8 or has dead frames, re-render, and critique again until all pass.

The first pass of `drop-reveal` found a static hook (two dead stretches, graded 5/10), headline words left behind by line wrapping, and labels covered by items. All were fixed before this version was rendered.

## Adding a scene

Copy `motion/scenes/drop-reveal/` to a new folder, keep the `window.SCENE = { duration, bpm, cues, render }` contract, and render it with `--scene <folder>`.

## To do once brand assets are in the repo

- Replace the placeholder colours in `site/tokens.css` with the real brand palette.
- Swap the drawn sachets, bars and box for the real logo and product photos.
