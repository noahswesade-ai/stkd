# STKD

Website and motion studio for STKD: one monthly Drop of protein, bars, pre-workout, creatine and an exclusive item from 8+ brands, for €49.90 a month.

- `site/` is the landing page: static HTML, CSS and JS, with no build step. Deploy the folder as is.
- `motion/` is the code-rendered motion graphics pipeline. See [MOTION.md](MOTION.md).

```sh
npm install
npm run dev        # site at http://localhost:8080
```

## Before launch

- **Waitlist:** set `data-endpoint` on both `.join` forms in `site/index.html` to a POST endpoint that accepts `{ "email": ... }` (for example Formspree, Klaviyo or Mailchimp). Until then the form tells visitors that nothing was sent.
- **Brand:** the colours, logo wordmark and product drawings are placeholders based on the STKD Packs doc. Replace them once the brand folder is in the repo.
- **Claims:** the page states the plan's numbers (€49.90 + €4.90 shipping, about €66 of products, 8+ brands, 15/8/12/30/1 contents, max 200 mg caffeine a serving, Spain at launch). Update them if the plan changes.
