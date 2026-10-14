# STKD: project memory for Claude

Read this file, then `MOTION.md` and `README.md`, before doing any work. It records what was decided and learned in earlier sessions so a new session can continue without the original chat.

## The business

STKD is a monthly supplement "Drop" for gym-goers in Spain. It's a student venture (Esade, Barcelona) and has not launched yet.

- **Offer (Turnaround Plan, Oct 2026):** one Drop a month, the same box for everyone, built around a theme. **€49.90 + €4.90 shipping.** Marketed as **about €66 of products** at shop prices.
- **Contents of each Drop:** 15 protein servings (3 flavours, single-serve sachets, at least 2 brands) · 8 protein bars (4 brands, 20 g+ protein) · 12 pre-workout servings (single sachets, **max 200 mg caffeine a serving**) · a month of creatine (30 servings) · 1 exclusive item, different every Drop. **8+ brands per Drop.**
- **Drop themes in planning:** Drop 001 (launch: best sellers plus a shaker), Tropical Drop, Dessert Drop, Summer Shred, Hecho en España.
- **Timeline:** decide and package the idea by 31 Oct 2026 · talk to suppliers and customers in Nov · test Drop Dec 2026–Jan 2027 · **pre-sale Feb–Mar 2027** · first paid Drops Apr–Jun 2027. So the site's CTA is a **waitlist**, not checkout.
- **Positioning lines from the founders:** "Try 15+ products for the price of 2" · "Never commit to one brand again" · "Everything you need. One box. No guesswork." · "Your Complete Performance Stack" · "Open. Fuel. Perform." Sell a *system or stack*, not individual products.
- **Product copy voice:** confident, a little gritty, playful about the secret flavours ("We're not telling you which flavours… And definitely not the bonus item. You'll see."). No commitment, no tubs.
- **Known risks:** novelty fatigue (82% cancel fitness subscriptions within 3 months, so each Drop must feel new), brand loyalty ("I get all my pre from MyProtein"), thin or negative margins at launch prices, shipping costs. Competitor Gainzbox ships only quarterly.
- **Growth plan:** gym and personal-trainer affiliates (about 15% commission), influencer affiliates (about 10%), free TikTok content over paid ads, uni campus sampling.
- **Sources:** the "STKD Packs" Google Doc (owner's Drive), the Claude Docs "STKD Turnaround Plan" and "STKD Packs: Critical Business Review", and the local STKD folder of images and documents.

## Visual direction (from the founders' notes)

- A **chrome box** with an embossed STKD logo. Premium "dark mode" ad look: black background, chrome reflections, one bright accent. The founders said an earlier design "doesn't look premium" and "looks a bit like a tobacco brand", so avoid that.
- Website notes: **logo centred at the top**, and **highlight the current page or section** in the nav.
- Ad storyboard (9:16, about 18 s): closed box with a light sweep ("Stop buying random supplements") → lid opens with a glow ("Get EVERYTHING you need") → protein, bars, pre-workout and sauce, one beat each → lifestyle → hero ("Your Complete Performance Stack") → CTA, ending loopable. Sound: a trap or gym beat that builds at the reveal, a metallic sweep, snaps on cuts, a bass hit on the box opening. Conversion rules: no shot longer than 2 s, show the variety clearly, loop cleanly, mobile first with big text.
- **Current colours and fonts are placeholders** (`site/tokens.css`: near-black, chrome greys, volt accent `#d7ff3c`, Archivo plus JetBrains Mono). **Replace them with the real brand assets from the local STKD folder** (logo, palette, product photos) once reviewed.

## What's built (branch `claude/stkd-business-prompts-rexkxi`)

- `site/` is a static landing page with no build step. Sections: announcement strip, sticky header (nav · centred logo · CTA), hero (copy, price, waitlist form, looping 4:5 video), stats, "What's in a Drop" cards, tubs-vs-Drop comparison, how it works plus Drop themes, FAQ, final CTA, and a sticky CTA on mobile. `npm run dev` serves it at http://localhost:8080.
  - The waitlist form needs a real endpoint in `data-endpoint` (Formspree, Klaviyo or Mailchimp). Until then it says nothing was sent.
  - Only claims from the plan appear on the page. **Never invent reviews, testimonials, customer counts or discounts.**
- `motion/` is the code-rendered motion studio. Full docs are in `MOTION.md`. Scene `drop-reveal` follows the storyboard above.
- A private preview of the site was published at https://claude.ai/artifact/D59uPNGLNRTJ7hf9WXX1Za. It's a copy, not live from the repo.

## Motion design method (learned and applied, keep using it)

The source was a video, "How to do motion design with Claude Opus 5.5". Its method:

1. **Headless render loop.** Claude writes code that paints each frame. Playwright captures each frame in Chromium, and FFmpeg stitches the frames into an MP4. Needs Node, FFmpeg and Playwright.
2. **Give it real references and assets.** Otherwise the output defaults to all-caps text centred on a gradient, which looks like AI slop.
3. **Real spring physics.** CSS transitions and easing keywords are banned. Use closed-form springs (`site/js/motion.js`: `spring`, `springInOut`, `SPRINGS`).
4. **Synthesize the sound in code** and lock every cut to the beat.
5. **Self-critique.** Claude looks at its own frames, hunts down dead frames and re-renders until every beat scores **at least 8/10**.

How this repo implements it:

- A scene is `motion/scenes/<name>/` with `window.SCENE = { duration, bpm, cues, render(t) }`. `render(t)` must be **pure**: every style is computed from `t` alone, with no timers or rAF. The timeline uses a beat grid `at(beat)`, and the sound cues use the same grid.
- `npm run render -- --scene drop-reveal --size 1080x1920 --out out/x.mp4` renders a 9:16 reel. Add `--captions 0 --mute --poster 6.9` for the site's hero loop (`site/media/drop-reveal-4x5.mp4`, 1080x1350). Add `--only 0,2.5,6.9` to render quick stills.
- `npm run critique -- out/x.mp4` runs FFmpeg freezedetect (stillness over 0.35 s counts as dead) and writes per-beat stills plus `sheet.png` to `out/critique/<name>/`. **Look at the sheet**, grade each beat on hierarchy, motion, phone legibility, brand fidelity and value clarity, fix anything under 8, re-render and repeat.

Lessons from the first critique passes:

- The hook's push-in spring settled too early and produced dead frames, so the motion during the hook must keep moving (continuous creep, a bigger box). A slow camera yaw with one period per loop keeps every beat alive.
- Headline lines need `white-space: nowrap`, or wrapped words stay visible when a line slides out.
- Keep item lanes clear of labels (the items lane starts at 50% width), and check the price block against the first row.
- Bring the opening headline back before the loop seam so the last frame matches the first, with no empty beat.
- JPEG frame capture is about 6x faster than PNG (about 30 s for a 300-frame render instead of about 4 min).
- H.264 needs even dimensions, so the renderer rounds odd sizes down to even.
- Item visuals are drawn placeholders (sachets, bars, stick packs, a mystery box). **Swap in real product photos and the real logo** from the STKD folder.

## Open tasks

1. Review every file in the local STKD folder. Then update `site/tokens.css`, the logo, the hero and the motion scene with the real brand assets. Re-render, critique and update the preview.
2. The owner's Instagram saved folder "ecom" holds conversion-focused videos to learn from. Use Claude in Chrome (the owner's own signed-in Chrome) or transcripts the owner pastes. Claude can't hear audio, so transcripts are the reliable source.
3. Connect the waitlist form to a real email provider.
4. Make more scenes: one per Drop theme, plus a 4:5 feed version with captions.

## Working with the owner

The owner is new to Claude Code, so give clear step-by-step instructions when they need to do something. Confirm before publishing anything publicly or posting to their accounts.
