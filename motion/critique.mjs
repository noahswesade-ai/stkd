#!/usr/bin/env node
// Critique pass for a rendered clip. It finds "dead frames" (stretches where
// nothing on screen moves) with FFmpeg's freezedetect, and exports one still
// per beat plus a contact sheet so Claude can look at its own frames and grade
// them. Workflow: MOTION.md.
//
//   node motion/critique.mjs out/drop-reveal-1080x1350.mp4 [--bpm 120] [--max-still 0.35]
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

const args = process.argv.slice(2);
const input = resolve(args[0] || "");
const opt = (k, d) => (args.includes(k) ? +args[args.indexOf(k) + 1] : d);
const bpm = opt("--bpm", 120);
const maxStill = opt("--max-still", 0.35);

const ff = (a) => new Promise((ok, fail) => {
  const p = spawn("ffmpeg", ["-hide_banner", ...a], { stdio: ["ignore", "ignore", "pipe"] });
  let err = "";
  p.stderr.on("data", (d) => (err += d));
  p.on("close", (c) => (c === 0 ? ok(err) : fail(new Error(err.slice(-1500)))));
});

const name = basename(input).replace(/\.mp4$/, "");
const dir = join(dirname(input), "critique", name);
await mkdir(dir, { recursive: true });

// 1. Dead frames: anything still for longer than maxStill seconds.
const log = await ff(["-i", input, "-vf", `freezedetect=n=-55dB:d=${maxStill}`, "-map", "0:v", "-f", "null", "-"]);
const starts = [...log.matchAll(/freeze_start: ([\d.]+)/g)].map((m) => +m[1]);
const durs = [...log.matchAll(/freeze_duration: ([\d.]+)/g)].map((m) => +m[1]);
const dead = starts.map((s, i) => ({ start: s, duration: durs[i] ?? null }));

// 2. One still per beat, and a contact sheet of all of them.
const perSec = bpm / 60;
await ff(["-y", "-i", input, "-vf", `fps=${perSec},scale=540:-2`, join(dir, "beat-%02d.png")]);
await ff(["-y", "-i", input, "-vf", `fps=${perSec},scale=240:-2,tile=5x4:padding=6:color=0x444444`, "-frames:v", "1", join(dir, "sheet.png")]);

const report = { input, dead_frames: dead, sheet: join(dir, "sheet.png"), beats: dir };
await writeFile(join(dir, "report.json"), JSON.stringify(report, null, 2));
console.log(dead.length ? `DEAD FRAMES: ${dead.map((d) => `${d.start.toFixed(2)}s (+${d.duration ?? "?"}s)`).join(", ")}` : "No dead frames.");
console.log(`Contact sheet: ${report.sheet}`);
console.log(`Beat stills:   ${dir}/beat-*.png`);
