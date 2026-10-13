// Page behaviour: spring-driven reveals, stat counters, active-section nav,
// the mobile sticky CTA and the waitlist form.
import { spring, clamp, SPRINGS } from "./motion.js";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Runs fn(p) every frame with a spring position p for `cfg`, until it settles.
function animate(cfg, fn, delay = 0) {
  if (reduced) return fn(1);
  const t0 = performance.now() / 1000 + delay;
  const tick = () => {
    const t = performance.now() / 1000 - t0;
    const p = spring(t, 0, cfg);
    fn(p);
    if (t < 0.05 || Math.abs(1 - p) > 0.001) requestAnimationFrame(tick);
    else fn(1);
  };
  requestAnimationFrame(tick);
}

// Reveal on scroll: elements rise in with a soft spring, staggered when
// several enter together.
const revealIO = new IntersectionObserver((entries) => {
  entries.filter((e) => e.isIntersecting).forEach((e, i) => {
    const el = e.target;
    revealIO.unobserve(el);
    animate(SPRINGS.soft, (p) => {
      el.style.opacity = clamp(p * 1.4);
      el.style.transform = p >= 1 ? "" : `translateY(${(1 - p) * 28}px)`;
    }, i * 0.07);
  });
}, { threshold: 0.15 });
document.querySelectorAll(".reveal").forEach((el) => revealIO.observe(el));

// Stat counters
const countIO = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    countIO.unobserve(e.target);
    const b = e.target;
    const n = +b.dataset.count, pre = b.dataset.prefix || "", suf = b.dataset.suffix || "";
    animate({ stiffness: 60, damping: 16 }, (p) => (b.textContent = pre + Math.round(clamp(p) * n) + suf));
  }
}, { threshold: 0.6 });
document.querySelectorAll("[data-count]").forEach((el) => countIO.observe(el));

// Highlight the nav link for the section in view
const links = [...document.querySelectorAll(".nav a")];
const navIO = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    for (const a of links) a.setAttribute("aria-current", a.hash === "#" + e.target.id ? "true" : "false");
  }
}, { rootMargin: "-45% 0px -50% 0px" });
links.forEach((a) => {
  const s = document.querySelector(a.hash);
  if (s) navIO.observe(s);
});

// Mobile sticky CTA: shown while neither waitlist form is on screen
const sticky = document.querySelector(".sticky");
const forms = [...document.querySelectorAll(".join")];
const visible = new Set();
let shown = false, stickyPos = 0;
sticky.style.transform = "translateY(140%)";
const stickyIO = new IntersectionObserver((entries) => {
  for (const e of entries) e.isIntersecting ? visible.add(e.target) : visible.delete(e.target);
  const want = visible.size === 0 && scrollY > 200;
  if (want === shown) return;
  shown = want;
  const from = stickyPos, to = want ? 1 : 0;
  animate(SPRINGS.snappy, (p) => {
    stickyPos = from + (to - from) * p;
    sticky.style.transform = `translateY(${(1 - stickyPos) * 140}%)`;
  });
});
forms.forEach((f) => stickyIO.observe(f));

// Waitlist form. Set data-endpoint on the form to a POST URL that accepts
// {email} as JSON (e.g. a Formspree, Klaviyo or Mailchimp endpoint).
for (const form of forms) {
  const msg = form.querySelector(".join-msg");
  const input = form.querySelector("input");
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const email = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      input.setAttribute("aria-invalid", "true");
      msg.textContent = "That email doesn't look right.";
      input.focus();
      return;
    }
    input.removeAttribute("aria-invalid");
    const endpoint = form.dataset.endpoint;
    if (!endpoint) {
      msg.textContent = "Waitlist isn't connected yet, so nothing was sent.";
      return;
    }
    const btn = form.querySelector("button");
    btn.disabled = true;
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ email }) });
      if (!res.ok) throw new Error(res.status);
      form.classList.add("done");
      msg.textContent = "You're on the list. We'll email you when pre-sale opens.";
      input.value = "";
    } catch {
      msg.textContent = "Something went wrong. Please try again.";
    } finally {
      btn.disabled = false;
    }
  });
}
