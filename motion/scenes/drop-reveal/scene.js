// Drop reveal: the STKD box opens on the beat, the month's stack lands in rows,
// the price lands, and everything packs back into the box so the clip loops.
// Storyboard source: "Frame-by-frame storyboard" in the STKD Packs doc.
//
// Query params: w, h (pixels), captions (1 = headline and price, 0 = product
// only, for placing next to website copy).
import { spring, springInOut, clamp, lerp, rng, beatGrid, SPRINGS } from "../../../site/js/motion.js";

const params = new URLSearchParams(location.search);
const W = +params.get("w") || 1080;
const H = +params.get("h") || 1350;
const CAPTIONS = params.get("captions") !== "0";
const u = Math.min(W, H) / 100;
const tall = H / u > 150;

const BPM = 120;
const { at } = beatGrid(BPM);
const DURATION = at(20); // 10 s, 5 bars

// ---------- timeline (seconds, all on the beat grid) ----------
const T = {
  sweep: at(1),
  reveal: at(4),          // lid lifts, music drops in
  lidAway: at(4.7),
  headline2: at(4.5),
  cats: [at(6), at(8), at(10), at(12), at(13)],
  headline2Out: at(14),
  was: at(14.5),
  strike: at(15),
  now: at(15.5),
  sub: at(16),
  priceOut: at(17.5),
  pack: at(16.8),
  lidBack: at(17.2),
  lidDrop: at(18),
  headline1In: at(18.5),
};

// ---------- layout ----------
const pad = 7 * u;
const box = { w: 50 * u, h: 15 * u, d: 24 * u, lid: 2.6 * u };
const boxY = H - (tall ? 32 : 18) * u;
const mouth = { x: W / 2, y: boxY - box.h * 0.55 };
const rowsTop = CAPTIONS ? (tall ? 56 : 42) * u : (tall ? 36 : 16) * u;
const rowsBottom = boxY - (tall ? 30 : 24) * u;
const rowGap = (rowsBottom - rowsTop) / 4;
const lane = { x0: W * 0.5, x1: W - pad };
const HOOK_SCALE = tall ? 1.5 : 1.3;      // box size during the hook, relative to the open state
const HOOK_RISE = (tall ? 34 : 14) * u;   // and how far it sits above its open-state position

const C = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const CATEGORIES = [
  { name: "Protein", count: "×15", note: "3 flavours", kind: "sachet", size: [6.6, 9],
    tags: ["COOKIE", "COOKIE", "CARAMEL", "CARAMEL", "PEACH", "PEACH"],
    colors: ["--f-cookie", "--f-cookie", "--f-caramel", "--f-caramel", "--f-peach", "--f-peach"] },
  { name: "Bars", count: "×8", note: "4 brands", kind: "bar", size: [13, 4.4],
    colors: [["--f-choc", "--f-vanilla"], ["--bone", "--f-choc"], ["--f-cake", "--f-vanilla"], ["--f-caramel", "--f-choc"]] },
  { name: "Pre-workout", count: "×12", note: "max 200 mg caffeine", kind: "sachet", size: [5.8, 7.4],
    tags: ["CANDY", "CANDY", "COLA", "COLA", "MELON", "MELON"],
    colors: ["--f-candy", "--f-candy", "--f-cola", "--f-cola", "--f-melon", "--f-melon"] },
  { name: "Creatine", count: "×30", note: "a full month", kind: "stick", size: [2.6, 10],
    colors: Array(8).fill("--f-orange") },
  { name: "Exclusive", count: "×1", note: "different every Drop", kind: "mystery", size: [8.5, 8.5],
    colors: ["--volt"] },
];

// ---------- build DOM ----------
const frame = document.getElementById("frame");
const rootStyle = frame.style;
rootStyle.setProperty("--w", W + "px");
rootStyle.setProperty("--h", H + "px");
rootStyle.setProperty("--u", u + "px");
rootStyle.setProperty("--pad", pad + "px");
rootStyle.setProperty("--box-y", boxY + "px");
rootStyle.setProperty("--mouth-y", mouth.y + "px");
rootStyle.setProperty("--box-w", box.w + "px");
rootStyle.setProperty("--box-h", box.h + "px");
rootStyle.setProperty("--box-d", box.d + "px");

if (!CAPTIONS) document.getElementById("caption").style.display = "none";

function phrase(lines) {
  const el = document.createElement("div");
  el.style.position = "absolute";
  el.style.left = "0";
  el.style.top = "0";
  el.style.width = "100%";
  const words = [];
  for (const line of lines) {
    const l = document.createElement("span");
    l.className = "line";
    for (const [text, accent] of line) {
      const w = document.createElement("span");
      w.className = "word" + (accent ? " accent" : "");
      w.textContent = text;
      l.appendChild(w);
      words.push(w);
    }
    el.appendChild(l);
  }
  document.getElementById("headline").appendChild(el);
  return words;
}
const headline = document.getElementById("headline");
headline.style.position = "relative";
headline.style.height = 8.4 * 0.98 * 3.2 * u + "px";
const h1Words = phrase([[["Stop"], ["buying"]], [["random", true]], [["supplements."]]]);
const h2Words = phrase([[["Everything."]], [["One"], ["box.", true]]]);

// Box faces
const px = (v) => v + "px";
function face(id, w, h, transform, chrome) {
  const el = document.getElementById(id) || Object.assign(document.createElement("div"), { className: "face" });
  el.style.width = px(w);
  el.style.height = px(h);
  el.style.transform = transform;
  if (chrome) el.classList.add("chrome");
  return el;
}
const { w: bw, h: bh, d: bd, lid: lh } = box;
face("f-front", bw, bh, `translate(${-bw / 2}px, ${-bh / 2}px) translateZ(${bd / 2}px)`, true);
face("f-back", bw, bh, `translate(${-bw / 2}px, ${-bh / 2}px) rotateY(180deg) translateZ(${bd / 2}px)`, true);
face("f-left", bd, bh, `translate(${-bd / 2}px, ${-bh / 2}px) rotateY(-90deg) translateZ(${bw / 2}px)`, true);
face("f-right", bd, bh, `translate(${-bd / 2}px, ${-bh / 2}px) rotateY(90deg) translateZ(${bw / 2}px)`, true);
face("f-inside", bw, bd, `translate(${-bw / 2}px, ${-bd / 2}px) rotateX(90deg) translateZ(${bh / 2 - 1}px)`);
document.querySelector("#f-front .emboss").style.fontSize = px(bh * 0.42);

// Lid: a chrome slab with its own edges, moved as one group.
const hinge = document.getElementById("hinge");
const lidTop = face("f-lid", bw, bd, `translate(${-bw / 2}px, ${-bd / 2}px) rotateX(90deg) translateZ(${lh}px)`, true);
lidTop.style.setProperty("--chrome-angle", "160deg");
lidTop.querySelector(".emboss").style.fontSize = px(bd * 0.36);
for (const [w, h, tf] of [
  [bw, lh, `translate(${-bw / 2}px, ${-lh}px) translateZ(${bd / 2}px)`],
  [bw, lh, `translate(${-bw / 2}px, ${-lh}px) rotateY(180deg) translateZ(${bd / 2}px)`],
  [bd, lh, `translate(${-bd / 2}px, ${-lh}px) rotateY(-90deg) translateZ(${bw / 2}px)`],
  [bd, lh, `translate(${-bd / 2}px, ${-lh}px) rotateY(90deg) translateZ(${bw / 2}px)`],
]) hinge.appendChild(face(null, w, h, tf, true));

// Category rows and items
const rowsEl = document.getElementById("rows");
const itemsEl = document.getElementById("items");
const items = [];
const labels = [];
CATEGORIES.forEach((cat, ci) => {
  const rowY = rowsTop + ci * rowGap;
  const label = document.createElement("div");
  label.className = "row-label";
  label.innerHTML = `<b>${cat.name}<span class="count">${cat.count}</span></b><small>${cat.note}</small>`;
  rowsEl.appendChild(label);
  labels.push({ el: label, y: rowY, ci });

  const rand = rng(97 + ci * 13);
  const n = cat.colors.length;
  const [iw, ih] = cat.size.map((v) => v * u);
  cat.colors.forEach((color, i) => {
    const el = document.createElement("div");
    el.className = "item " + cat.kind;
    el.style.width = px(iw);
    el.style.height = px(ih);
    if (cat.kind === "bar") {
      el.style.setProperty("--c", C(color[0]));
      el.style.setProperty("--c2", C(color[1]));
    } else {
      el.style.setProperty("--c", C(color));
    }
    if (cat.tags) el.innerHTML = `<span class="tag">${cat.tags[i]}</span>`;
    if (cat.kind === "mystery") el.textContent = "?";
    itemsEl.appendChild(el);

    let tx, rot;
    if (cat.kind === "stick") {
      // Fan of sticks around the middle of the lane
      const mid = (lane.x0 + lane.x1) / 2;
      tx = mid + (i - (n - 1) / 2) * 3.1 * u - iw / 2;
      rot = (i - (n - 1) / 2) * 2.5;
    } else if (cat.kind === "mystery") {
      tx = (lane.x0 + lane.x1) / 2 - iw / 2;
      rot = -6;
    } else {
      const span = lane.x1 - lane.x0 - iw;
      tx = lane.x0 + (n === 1 ? span / 2 : (i * span) / (n - 1));
      rot = (rand() - 0.5) * (cat.kind === "bar" ? 14 : 18);
    }
    const ty = rowY + (rand() - 0.5) * 1.2 * u - ih / 2 + 2.2 * u;
    items.push({
      el, w: iw, h: ih, tx, ty, rot,
      spin: (rand() - 0.5) * 140,
      start: T.cats[ci] + i * 0.045,
      back: T.pack + (CATEGORIES.length - 1 - ci) * 0.07 + i * 0.012,
      arc: (6 + rand() * 6) * u,
      wobble: cat.kind === "mystery",
    });
  });
});

// Film grain, drawn once from a fixed seed
(function grain() {
  const c = document.getElementById("grain");
  c.width = Math.round(W / 2);
  c.height = Math.round(H / 2);
  const g = c.getContext("2d");
  const img = g.createImageData(c.width, c.height);
  const r = rng(7);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = r() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
})();

// ---------- per-frame render ----------
const $ = (id) => document.getElementById(id);
const boxEl = $("box"), glow = $("glow"), shadow = $("shadow");
const sweeps = [...document.querySelectorAll(".sweep")];

const LID_SLIDE = { stiffness: 210, damping: 24 };
const LID_DROP = { stiffness: 300, damping: 17 };

function render(t) {
  // Camera: the hook holds the box big and creeping closer; the reveal pulls
  // back to make room for the stack; the close pushes in again so the last
  // frame matches the first. The yaw completes one period per loop.
  const yaw = -9 + 5 * Math.sin((2 * Math.PI * t) / DURATION);
  const hook = 1 - spring(t, T.reveal, SPRINGS.heavy) + spring(t, T.lidDrop + 0.25, SPRINGS.soft);
  const creep = t < T.reveal ? 0.07 * Math.sin((Math.PI / 2) * (t / T.reveal)) : 0;
  const scale = 1 + (HOOK_SCALE - 1) * hook + creep;
  const rise = -HOOK_RISE * hook;
  const thump = 0.035 * (springInOut(t, T.reveal, T.reveal + 0.12, SPRINGS.bouncy) + springInOut(t, T.lidDrop + 0.08, T.lidDrop + 0.2, SPRINGS.bouncy));
  boxEl.style.transform = `translateY(${rise}px) scale(${scale - thump}) rotateX(-26deg) rotateY(${yaw}deg)`;
  shadow.style.transform = `translate(-50%, calc(-50% + ${rise}px)) scale(${scale})`;

  // Lid: lifts, slides off to the right, comes back and drops shut.
  const lift = spring(t, T.reveal, SPRINGS.heavy) - spring(t, T.lidDrop, LID_DROP);
  const slide = spring(t, T.lidAway, LID_SLIDE) - spring(t, T.lidBack, LID_SLIDE);
  const lx = slide * W * 0.95;
  const ly = -lift * 16 * u - slide * 8 * u;
  hinge.style.transform = `translate3d(${lx}px, ${-bh / 2 + ly - 1}px, 0) rotateZ(${slide * 14}deg)`;

  // Light sweep across the chrome during the hook
  const sp = clamp((t - T.sweep) / 1.1);
  const sweepX = lerp(-50, 130, sp * sp * (3 - 2 * sp));
  for (const s of sweeps) s.style.left = sweepX + "%";

  // Glow from inside the open box
  const open = clamp(spring(t, T.reveal, SPRINGS.soft) - spring(t, T.lidDrop - 0.1, SPRINGS.snappy), 0, 1.2);
  const pulse = 1 + 0.08 * Math.max(0, Math.cos((2 * Math.PI * (t - T.reveal)) / (60 / BPM)));
  glow.style.opacity = open * 0.75 * pulse;

  // Items
  for (const it of items) {
    const out = spring(t, it.start, SPRINGS.bouncy);
    const back = spring(t, it.back, SPRINGS.snappy);
    if (out <= 0.0001 || back >= 0.999) { it.el.style.opacity = 0; continue; }
    const p = clamp(out, 0, 1.15);
    const ox = mouth.x - it.w / 2, oy = mouth.y - it.h / 2;
    let x = lerp(ox, it.tx, p);
    let y = lerp(oy, it.ty, p) - it.arc * Math.sin(Math.PI * clamp(p));
    x = lerp(x, ox, back);
    y = lerp(y, oy, back);
    const s = lerp(0.4, 1, clamp(spring(t, it.start, SPRINGS.snappy))) * lerp(1, 0.4, back);
    let r = lerp(it.spin, it.rot, clamp(spring(t, it.start, SPRINGS.snappy)));
    if (it.wobble) r += 5 * Math.sin((t - it.start) * Math.PI * 2 * (BPM / 60) / 2);
    r = lerp(r, it.spin * 0.5, back);
    const above = clamp((mouth.y - (y + it.h)) / (4 * u) + 0.15);
    it.el.style.opacity = above;
    it.el.style.transform = `translate(${x}px, ${y}px) rotate(${r}deg) scale(${s})`;
  }

  // Row labels
  for (const lb of labels) {
    const inn = spring(t, T.cats[lb.ci] + 0.05, SPRINGS.snappy);
    const outp = spring(t, T.pack + (CATEGORIES.length - 1 - lb.ci) * 0.07, SPRINGS.snappy);
    const v = clamp(inn) * (1 - clamp(outp));
    lb.el.style.opacity = v;
    lb.el.style.transform = `translate(${(1 - inn) * -5 * u}px, ${lb.y - 3.4 * u}px)`;
  }

  if (!CAPTIONS) return;

  // Headline 1 shows on the loop seam, leaves at the reveal, returns at the end.
  h1Words.forEach((w, i) => {
    const leave = spring(t, T.reveal + i * 0.03, SPRINGS.snappy);
    const ret = spring(t, T.headline1In + i * 0.035, SPRINGS.snappy);
    const y = t < T.headline1In ? -115 * leave : 115 * (1 - ret);
    w.style.transform = `translateY(${y}%)`;
  });
  h2Words.forEach((w, i) => {
    const inn = spring(t, T.headline2 + i * 0.04, SPRINGS.snappy);
    const outp = spring(t, T.headline2Out + i * 0.03, SPRINGS.snappy);
    w.style.transform = `translateY(${115 * (1 - inn) - 115 * outp}%)`;
  });

  // Price block
  const priceOut = spring(t, T.priceOut, SPRINGS.snappy);
  const wasIn = spring(t, T.was, SPRINGS.snappy);
  $("was").style.opacity = clamp(wasIn) * (1 - clamp(priceOut));
  $("was").style.transform = `translateY(${(1 - wasIn) * 3 * u - priceOut * 4 * u}px)`;
  $("strike").style.transform = `scaleX(${clamp(spring(t, T.strike, SPRINGS.snappy), 0, 1.05)})`;
  const nowIn = spring(t, T.now, SPRINGS.bouncy);
  $("now").style.opacity = clamp(nowIn * 3) * (1 - clamp(priceOut));
  $("now").style.transform = `translateY(${-priceOut * 5 * u}px) scale(${lerp(0.82, 1, nowIn)})`;
  $("now").style.transformOrigin = "left bottom";
  const subIn = spring(t, T.sub, SPRINGS.snappy);
  $("sub").style.opacity = clamp(subIn) * (1 - clamp(priceOut));
  $("sub").style.transform = `translateY(${(1 - subIn) * 2 * u - priceOut * 4 * u}px)`;
}

// Sound cues, locked to the same grid. The synth reads these.
const cues = [
  { t: T.reveal - at(0.5), kind: "riser" },
  { t: T.reveal, kind: "impact" },
  { t: T.lidAway, kind: "whoosh" },
  ...T.cats.map((t) => ({ t, kind: "tick" })),
  { t: T.headline2Out, kind: "swipe" },
  { t: T.strike, kind: "swipe" },
  { t: T.now, kind: "hit" },
  { t: T.pack, kind: "whoosh" },
  { t: T.lidDrop, kind: "thud" },
];

window.SCENE = { name: "drop-reveal", duration: DURATION, bpm: BPM, cues, render };
await document.fonts.ready;
render(0);
window.SCENE_READY = true;
