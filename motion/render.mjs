#!/usr/bin/env node
// Headless render loop: Chromium paints each frame of a scene at an exact time,
// Playwright captures it, FFmpeg stitches the frames and the synthesized
// soundtrack into an MP4.
//
//   node motion/render.mjs --scene drop-reveal --size 1080x1920 --out out/drop-reveal-9x16.mp4
//   options: --fps 30  --captions 0  --mute  --poster 6.9  --only 2.0,6.5 (stills only)
import { mkdir, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { synthesize } from "./synth.mjs";
import { serve } from "./serve.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const a = { fps: 30, size: "1080x1350", captions: "1", mute: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i].replace(/^--/, "");
    if (k === "mute") a.mute = true;
    else a[k] = argv[++i];
  }
  if (!a.scene) throw new Error("--scene is required");
  const [w, h] = a.size.split("x").map(Number);
  return { ...a, w, h, fps: +a.fps, out: a.out || `out/${a.scene}-${a.size}.mp4` };
}

function run(cmd, args, { stdin } = {}) {
  const p = spawn(cmd, args, { stdio: [stdin ? "pipe" : "ignore", "ignore", "pipe"] });
  let err = "";
  p.stderr.on("data", (d) => (err += d));
  const done = new Promise((ok, fail) => p.on("close", (code) => (code === 0 ? ok() : fail(new Error(`${cmd} exited ${code}\n${err.slice(-2000)}`)))));
  return { proc: p, done };
}

export async function render(opts) {
  const { scene, w, h, fps, captions, mute, out } = opts;
  await mkdir(dirname(resolve(ROOT, out)), { recursive: true });
  // ES modules don't load from file://, so serve the repo over localhost.
  const server = await serve(ROOT);
  const url = `http://127.0.0.1:${server.address().port}/motion/scenes/${scene}/index.html?w=${w}&h=${h}&captions=${captions}`;

  const executablePath = process.env.CHROMIUM_PATH || (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
  const browser = await chromium.launch({ executablePath, args: ["--font-render-hinting=none", "--disable-lcd-text"] });
  try {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    page.on("pageerror", (e) => console.error("scene error:", e.message));
    await page.goto(url);
    await page.waitForFunction(() => window.SCENE_READY === true, null, { timeout: 15000 });
    const meta = await page.evaluate(() => ({ duration: SCENE.duration, bpm: SCENE.bpm, cues: SCENE.cues }));
    const shot = async (t) => {
      await page.evaluate((t) => SCENE.render(t), t);
      return page.screenshot(opts.only || opts.png ? { type: "png" } : { type: "jpeg", quality: 95 });
    };

    // Stills only: for quick looks during critique
    if (opts.only) {
      const { writeFile } = await import("node:fs/promises");
      for (const t of String(opts.only).split(",").map(Number)) {
        const file = resolve(ROOT, out.replace(/\.mp4$/, "") + `-t${t.toFixed(2)}.png`);
        await writeFile(file, await shot(t));
        console.log(file);
      }
      return;
    }

    const frames = Math.round(meta.duration * fps);
    const outAbs = resolve(ROOT, out);
    const wav = outAbs.replace(/\.mp4$/, ".wav");
    if (!mute) synthesize(meta, wav);

    const ff = run("ffmpeg", [
      "-y", "-f", "image2pipe", "-framerate", String(fps), "-c:v", opts.png ? "png" : "mjpeg", "-i", "-",
      ...(mute ? [] : ["-i", wav]),
      "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
      ...(mute ? ["-an"] : ["-c:a", "aac", "-b:a", "192k", "-shortest"]),
      "-movflags", "+faststart", outAbs,
    ], { stdin: true });

    const t0 = Date.now();
    for (let f = 0; f < frames; f++) {
      const png = await shot(f / fps);
      if (!ff.proc.stdin.write(png)) await new Promise((ok) => ff.proc.stdin.once("drain", ok));
      if (f % fps === 0) process.stdout.write(`\rframe ${f}/${frames}`);
    }
    ff.proc.stdin.end();
    await ff.done;
    if (!mute) await unlink(wav);
    console.log(`\rrendered ${frames} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s → ${out}`);

    if (opts.poster) {
      const { writeFile } = await import("node:fs/promises");
      const png = outAbs.replace(/\.mp4$/, "-poster.png");
      await writeFile(png, await shot(+opts.poster));
      const jpg = png.replace(/\.png$/, ".jpg");
      await run("ffmpeg", ["-y", "-i", png, "-q:v", "3", jpg]).done;
      await unlink(png);
      console.log(`poster → ${jpg}`);
    }
  } finally {
    await browser.close();
    server.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  render(parseArgs(process.argv.slice(2))).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
