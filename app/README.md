# Osyle, the app

The Osyle MLP frontend, built from the v5 build prompt. This tree carries
build stages 1, 3, 4, and 5. Stage 2, the real backend, is intentionally
absent, so the product runs entirely in Demo Mode: the seeded SkyRecall
resident, deterministic and offline, exactly as the spec's Section 13
describes it.

## Run

```
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build
npm test         # walks the whole journey in Chromium, asserts each step
```

## The Findings Desk

Once a resident is analyzed, Findings shows everything in one decidable
dashboard: each problem carries its evidence and an estimated monthly
value of fixing it, always labeled an estimate and always citing where
the number comes from; what is genuinely good is said plainly beside it.
Every card takes exactly one decision, accept or set aside. Accepting a
healable finding heals it on the spot; accepting the broken key hands
over the Fix Prompt. Set-aside findings dim, stay in the report, and can
be brought back. When every decision is made, the desk says so and
offers one door: back to the rest.

## The journey

Setup runs on a visible breadcrumb: Place (a real dropzone), Materials
(the gradient reads, then every file shows what was understood), Style,
Launch (review, then the earned Vitality reveal). After launch the app
always opens at Home, never the brochure. Home's one CTA always names
the next step: heal with a receipt, see what changed, send the fix
prompt, or the honest rest state, nothing needs you. Coming back after
hours opens with Since you left, one card, one door. First-run
explainers appear once each and never again. The tab title carries the
resident's name, number, and unread count. No screen ends without a
door.

## What is in this build

**Stage 1, shell and brand.** Design tokens extracted from the two Figma
sources (see `BRAND.md`): the warm paper canvas, the dotted working grid,
two-tone editorial statements, floating pill controls, soft cards, and the
one dark action per screen. The brand surface (landing) is near-black with
the violet-white glow. The Promote tab renders as an honest static surface
with its Opening soon sheet, per Section 1 of the spec.

**Stage 3, the seeded Examination and home surface.** Ten lenses with the
weighted Vitality Score (66 at rest), including the broken weather key in
the connectors lens and the value-and-clarity paragraph. The home surface
obeys its hard rules: at rest, three numbers, one pulse line, one CTA.

**Stage 4, Transform, Reveal, Heal, lifecycle.** The before-and-after
slider on the SkyRecall preview, the Reveal with why-annotations on every
repair, one-tap Heal that raises Vitality from 66 to 69 with a rising
pulse, and the issue lifecycle (new, recurring, regressed, healed) tracked
across three seeded examinations. The unfixable broken key falls back to
the Fix Prompt, copyable.

**Stage 5, the life.** The Address surface (serving, Alive at Osyle,
visible quotas, one-click export), the tiny SDK (`src/sdk/osyle.ts`: rows,
auth-lite, key-value, localStorage transport in Demo Mode with the API
shape as the contract), the Monitor (uptime, response sparkline, the
live drop-off event), and the Inbox, one quiet stream of human sentences.

## Structure

```
src/
  styles.css        design tokens and the component language
  store.tsx         demo state: view, heals, vitality, inbox
  sdk/osyle.ts      the resident SDK, demo transport
  data/seed.ts      the SkyRecall seed, every number and sentence
  components/       chrome (top bar, bottom bar, sparkle), MiniApp
  views/            one file per screen
```

## The rules this build keeps

- The motion law: 200 to 300ms, ease-out, nothing bounces, except the
  pulse, which breathes.
- The tone: calm, specific, kind, brief. No exclamation marks, no emoji,
  no em-dashes in any string (audited).
- The shell is achromatic. Color enters as the violet pulse and as the
  resident's own identity in its preview.
- Exactly one dark element per screen, the primary action.
