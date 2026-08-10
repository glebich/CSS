# Osyle: architecture review, UX return-loop review, and the road to the real product

Status: for approval, no code written against this plan yet.
Source of truth: the MLP build prompt v5 (all 16 sections, 45 acceptance
criteria), the Osyle_N Figma file, and what is already on this branch.

---

## Part 1. What exists today, honestly

### 1.1 Inventory

One deliverable is on the branch: `app/`, a Vite + React 18 + TypeScript
SPA, about 3,000 lines, zero runtime dependencies beyond React. It covers
build stages 1, 3, 4, 5 of the spec in Demo Mode, restyled twice against
the Figma sources, runtime-verified in Chromium after every pass.

```
app/src/
  styles.css          the design system, measured Figma values (~1,100 lines)
  store.tsx           one React context: view machine, tabs, mood, persona,
                      style, device, heal state, inbox
  data/seed.ts        every number and sentence of the SkyRecall demo
  sdk/osyle.ts        the resident SDK: rows, auth-lite, kv over localStorage
  components/         chrome (bars, icons), MiniApp (live render), panels
  views/              13 screens: landing, place, assets, style, launch,
                      home, exam, transform, reveal, issues, address,
                      monitor, inbox, sdk, promote
```

### 1.2 Conventions in force

- One file per screen, functional components, no classes.
- System components (pills, cards, statements) live in `styles.css` as
  measured tokens; layout is inline styles in views. Copy obeys the tone
  law (no exclamation marks, emoji, or em-dashes; audited each pass).
- One dark element per screen; color only via pulse and resident identity.
- Demo Mode is deterministic: every number derives from `seed.ts`, heal
  deltas recompute Vitality (66 at rest, 69 healed), state persists in
  namespaced localStorage keys.

### 1.3 Design patterns

- **View state machine, not a router.** `view` is an enum in context.
- **Contract-first SDK.** `sdk/osyle.ts` is the future `@osyle/sdk`
  surface; only the transport is fake. This is the spec's no-rewrite
  growth path made concrete.
- **Seeded determinism** (spec §13 Demo Mode): the ten-lens report, the
  broken weather key, lifecycle across three examinations, all scripted.
- **Preview as a function of choices.** `MiniApp` renders from
  (style, mood, persona, device) so Transform, RUN, and panels all share
  one truth.

### 1.4 Technical debt (ranked)

1. **No router.** Back button dead, no deep links, refresh loses your
   place. Worst single UX debt for ordinary users.
2. **No tests.** Verification is a scripted Playwright walkthrough kept in
   the scratchpad, not committed, not CI. Violates the repo's own
   Definition of Done.
3. **Single context store.** Any change re-renders every consumer. Fine at
   3k lines; wrong once Monitor polls live data.
4. **Cosmetic tabs.** New tabs replay the same demo; no per-tab state.
5. **Shallow mood and persona wiring.** They change copy, color, and
   density of the render; honest for a demo, not the adaptation engine of
   spec §7.
6. **Monolithic styles.css.** At the Owner console it must split.
7. **Brand asset is a reconstruction.** The cloud egress policy blocks
   figma.com downloads, so the exported logo bytes cannot be committed
   from here (acceptance criterion 45 open). Needs one export from a
   machine with Figma access.
8. **Accessibility gaps.** Labels exist; keyboard operation of the mood
   dials, slider, and focus management do not.
9. **No error boundaries, no designed empty or failure states.** Demo Mode
   never fails, real mode will.
10. **Lifecycle helper couples to seed shape** (`history.length` implies
    first-seen exam); fine for seeds, brittle for real exam storage.

### 1.5 Dependencies

`react`, `react-dom` (runtime); `vite`, `typescript`, `@vitejs/plugin-react`,
`playwright-core` (dev). No UI kit, no CSS framework, no state library.
This is an asset: the design system is bespoke to the Figma files and the
bundle is 65 KB gzipped.

---

## Part 2. The UX, walked end to end

### 2.1 The journey as built

```
START  Landing (brand surface, one line, one button)
   -> Place (drop the app: statement, type pills, one dark action)
   -> Assets (gradient sweeps while reading -> understood previews)
   -> Explore a style (gallery, categories, Add)
   -> Ready to launch (review card -> Create the concept)
ARRIVE Home (Vitality 66, pulse line, Heal)
   -> Examination / Transform+Reveal / Issues (the work)
   -> Address / Monitor / Inbox / SDK / Promote (the life)
END    ...nothing says what happens next
RETURN ...undefined: nothing marks time away or pulls anyone back
```

The first 90 seconds are strong. The end and the return are the two
missing acts, and they are exactly where the love thesis lives
("returns two days later unprompted").

### 2.2 Fix list for ordinary, non-technical users

Priorities: P0 ships with the next stage, P1 soon after, P2 when its
stage arrives. Effort: S under half a day, M a day or two, L more.
The spec's own law constrains the "addictive" ask: the psychology lens
removes manipulation by design. So the return loop is built from care,
not hooks: no streak guilt, no fake urgency, ever. What makes people
return is that the product visibly worked while they were away.

**Orientation (knowing where you are)**

1. P0 S. Real URLs. `/skyrecall/home`, `/skyrecall/exam` etc. Back button,
   refresh, and share-a-screen all start working. (Router adoption.)
2. P0 S. Flow breadcrumb on the four setup screens: quiet step dots
   (place, materials, style, launch) top-center, clickable backwards, so
   the Launch stepper stops being a surprise.
3. P0 S. First-run explainers, one sentence each, shown once: what
   Vitality is (under the numeral), what Heal will do (on the button),
   what an examination is (on the reveal). Dismiss forever on tap.
4. P1 S. Name the icon circles. The five life circles and mood, persona
   get visible labels on hover and on first visit, not title-attributes.
5. P1 M. Responsive floor. Below 1280px the bottom bar must collapse
   (nav pills into a sheet); below 900px the canvas stacks.

**Confidence (trusting what it does)**

6. P0 S. A real dropzone. Drag-over state on Place (the whole canvas
   lifts, statement swaps to "Let go"), file-input fallback on click.
   Even in Demo Mode, dropping anything imports the demo resident with
   your file's name acknowledged: "We will read Coffee.zip in Real Mode.
   Meanwhile, meet SkyRecall."
7. P0 S. Heal preview. Before healing: "Heal will touch four things",
   expandable list, then the one tap. Magic with a receipt.
8. P1 S. Mood and persona panels carry a live thumbnail of the render
   inside the panel, so cause and effect sit in one glance.
9. P1 S. After Create the concept, land on Home with the reveal moment
   (numeral counts up from 0 to 66 once, 600ms, the only time it moves
   without cause), so the first number feels earned, not asserted.
10. P2 M. Every failure state designed: connector down, model budget
    exhausted, offline. Calm sentences, one action each.

**Momentum (always a next step)**

11. P0 S. No dead ends. Reveal ends with "Heal these now" (if open) or
    "See the issues' lives"; Heal completion offers "See what changed"
    (diff to Transform); Promote waitlist ends with "Back to the work".
    Rule: every screen's last element is a door, not a wall.
12. P0 S. Home CTA reflects state precisely: issues waiting -> Heal n;
    healed but unexamined -> "Run the next examination"; everything
    clean -> "Nothing needs you. The Art Director watches."
    That last sentence is the permission to leave that builds trust.
13. P1 M. The next examination is a scheduled event with a visible date
    ("Examines again Friday"), which gives the return a reason and a
    rhythm. Demo Mode: the date is seeded.

**The return loop (the honest addiction)**

14. P0 M. "Since you left" moment: returning after 4+ hours, Home first
    renders a single card: vitality delta, sessions served, one sentence
    of what happened, one CTA. Then it folds into the normal surface.
    This is the heart of coming back: the product visibly lived.
15. P1 S. Tab title carries the state quietly: "Osyle, SkyRecall 66" and
    the unread count. The browser tab itself becomes the ambient monitor.
16. P1 M. Inbox becomes the timeline of the resident's life (it nearly
    is): every heal, every stall, every examination lands there with a
    timestamp, so absence has a story to catch up on in ten seconds.
17. P2 M. The weekly Art Director note (stage 8) is the retention engine
    the spec already designed: one quotable insight per week, arriving in
    the Inbox and by email. Nothing in the product guilts; the note earns
    the visit.
18. P2 S. Share loops as return loops: the Report Card image and the
    before-and-after link (stage 13) carry the address; every share is a
    door back in.

**Joy (the feel)**

19. P1 S. The pulse breathes everywhere state is alive (it does), and
    heal's rise animates the numeral stepwise (it does); add one quiet
    sound-free celebration on first heal: the pulse line swells once.
20. P2 S. Micro-copy pass: every sentence in the product read aloud once,
    anything that sounds like software rewritten to sound like the calm
    doctor of §11.

### 2.3 Where the user starts, ends, returns (after fixes)

- **Start**: landing or a shared link; either lands in a 90-second path
  with visible steps and no blank inputs anywhere.
- **End of a session**: always at a door: a scheduled next examination, a
  quiet "nothing needs you", or a share. Leaving is designed, not a
  timeout.
- **Return**: the tab title or the weekly note pulls; "Since you left"
  pays the visit off in five seconds; the next action is one tap deep.

---

## Part 3. The road to the real product, one stage at a time

Stages already delivered: 1, 3, 4, 5 (Demo Mode), plus the audience and
style surfaces of 6 ahead of schedule. The order below follows the spec's
§14 with stage 2 next, exactly as requested: one stage per increment,
each landing with tests, runtime verification, and the Definition of Done.

### Increment A. UX return-loop fixes, P0 set (pre-backend). DELIVERED

Delivered fixes 2, 3, 6, 7, 8, 9, 11, 12, 14, 15, 19 plus a committed
journey test (`app/tests/flow.test.mjs`, `npm test`, 13 assertions) and
one unplanned find: after launch the app reopens at Home, not the
landing page, which the return moment depends on. Fix 1 (real URLs) was
dropped by decision: desktop web first, the browser owns history.
Remaining from the list: 5 (responsive floor), 10, 13, 16 to 18, 20,
scheduled with their stages.

### Increment A2. The Findings Desk. DELIVERED

Requested after A: the examination's output as one decidable dashboard.
Every finding carries its evidence and an estimated monthly value of
fixing it (labeled an estimate, citing its source); strengths are shown
beside faults; each card takes one decision, accept or set aside;
accepting heals on the spot or hands over the Fix Prompt; when all is
decided, one door returns to rest. Findings replaced Issues in the
product nav; the lifecycle view remains one door deeper.

### Increment B. Stage 2, backend foundation. DELIVERED

Delivered as specified below, with one honest deviation: the storage
drivers shipped are node:sqlite and the filesystem behind the swap
interfaces, because this build environment cannot run containers; the
compose stack provisions Postgres, Redis, and MinIO, whose drivers land
in Real Mode hardening at the two marked swap points. The SDK became a
workspace package with local and http transports and the app now
consumes it; 25 api checks run without sockets via inject, covering
auth, residents, vault versions and restore, the resident database
straight and through the SDK's http transport, and cross-user
isolation. Foundation debt, scheduled: session expiry, per-resident rdb
keys, Redis-backed queues, the mailer.

Goal (spec §13): the five-container stack up, auth, residents, Vault with
versions, health. Nothing user-visible changes except Real Mode existing.

Monorepo reshape (the no-rewrite migration):

```
/app                 the SPA, unchanged surface
/packages/sdk        @osyle/sdk: the exact api of app/src/sdk/osyle.ts,
                     two transports: localStorage (demo), HTTP (real)
/packages/shared     types: Resident, Examination, Issue, Lens, Material
/api                 TypeScript modular monolith (Fastify): auth (magic
                     link), residents, vault (files, versions, restore),
                     health; module-per-domain, no microservices
/worker              queue consumer (BullMQ on Redis): examinations,
                     transcodes, later the Art Director rounds
/infra               docker-compose: caddy (wildcard *.osyle.app), api,
                     worker, postgres+redis, minio; per-resident libSQL
                     files on a volume
/ops                 install.sh, update.sh (one button, auto-rollback),
                     backup.sh (nightly, encrypted, restore drill)
```

Key decisions inside stage 2:
- Postgres owns platform truth (users, residents, versions metadata,
  examinations); MinIO owns bytes; libSQL per resident owns end-user data
  behind the SDK; Redis owns queues and rate limits.
- The SPA gains a `mode` flag: demo (default, today's behavior, always
  works offline) and real (HTTP transport). Demo Mode is a permanent
  feature per spec §13, not scaffolding, so the seeds stay.
- Auth: magic-link only, session cookie, no passwords anywhere.

Acceptance: stack up with one script on a clean machine; create user by
magic link; create resident; upload files; version and restore; health
endpoint green; nightly backup produces a restorable archive (drilled).
Effort: the largest single increment, 1 to 2 weeks equivalent.

### Increment B2. Bug pass and addendum adoptions. DELIVERED

The bug pass: the responsive floor now reaches 390 with no horizontal
overflow (tested), the slider and mood dials answer the keyboard with
slider semantics, the materials note joined the layout properly, and
the copy audit (no em-dashes, no emoji, no lorem, no render-time
randomness) stays clean across app, api, and packages.

Adopted from the addenda, chosen for value now:
- The four StyleModels as real token systems (Aria, Mono Studio, Warm
  Counsel, Night Shift) with per-style radii, leading the catalog.
- The deterministic feeling mapping with honest captions ("Bigger,
  calmer, slower"; "Interpreted as: calmer"), wired into Explore a
  style as chips plus free text, and the comfort variant scaling the
  live render's type by 20 percent.
- The Decision Ledger: every style choice, feeling, finding decision,
  heal, and transform acceptance appended with context, resident
  scoped, included in the Address export. Collected from day one
  because it cannot be reconstructed later.
- Criterion 28: the examination closes with one sentence of genuine
  understanding.
- Demo determinism controls: R three times resets pristine; period
  opens the hidden settings sheet with the Real Mode switch and
  format-validated Anthropic and Gemini key fields.
- The Survival Index: residents stamp last activity on every rdb
  touch; GET /survival reports alive, total, and weekly cohorts.
- The Partner Door: POST /partner/import turns an email and a name
  into a resident, its address, and a claim link, in one call.

Deferred to their stages, noted: the Analysis Theater's agent feed,
Discover and search, the attention map, /r/{slug} live serving, and
the BEFORE's full expensively-bad spec.

### Increment B3. The Analysis Theater and the living address. DELIVERED

The golden path's two theatrical moments, both testable by hand: the
six-phase agent feed with its live understanding panel and ghost Skip
(about 35 seconds, deterministic, one constant from the spec's 45), and
the address ceremony whose Open serves the resident itself at
`#/r/{slug}`: a real SkyRecall with working drills and a logbook
persisted through the SDK, wearing the chosen identity. Same-tab and
new-tab navigation both work (a hashchange listener fixed the same-tab
case); a breadcrumb overlap on Explore a style was found by the
screenshot pass and fixed. 60 checks total across both suites.

### Increment B4. The real Examination engine. DELIVERED

The pivot from theater to instrument, on the user's direct order to
stop faking. Dropped files and zips are now actually parsed (40 files,
5 MB text, capped honestly) and measured by eight lens analyzers, each
grounded in named research and each producing evidence with file and
line: WCAG 2.1 contrast mathematics on declared color pairs, alt-text
and type-size floors, typeface and size-ramp counts, palette size and
same-hue accent clustering, Hick's-law choice load per screen, the
deceptive-pattern lexicon (Brignull; Mathur et al. 2019), stray logs
and TODO debt, committed credentials, eval and raw-HTML injection, and
script weight. Vitality is the documented weighted mean of measurable
lenses only; lenses that cannot see say so. The theater streams real
progress lines during a real run; the findings desk shows severity,
evidence, grounding, and method limits, with accept-to-plan decisions
in the ledger; the preview is two live frames of the actual page, side
by side, the right one wearing the chosen style's token layer,
honestly labeled. The slider is gone. The example resident remains,
labeled Example everywhere it appears. Polish from the same feedback:
Select instead of CTA, the Yours badge moved off the title, the empty
folder cards replaced by a real inventory card, fake component counts
removed from Launch. Verified by dropping a deliberately flawed
fixture project and asserting the engine catches the weak contrast at
its true line, the committed key, and the dark-pattern copy: 40
journey checks pass.

### Increment C. Stage 6, the Audience for real

Archetype composition from a sentence, discovery mode with cited
rationale, the funnel dial at 60fps with live reach estimates, wired into
adaptation and benchmarks (criteria 37 to 39, 42). The panels from this
branch become the real thing; the age dial gets real interpolation and
per-archetype trait toggles; no protected-category targeting exists by
construction (an interface audit is part of acceptance).

### Increment D. Stage 7, Studio and BYOK

The model gateway in `/api`: BYO Anthropic and Gemini keys, budgets,
invisible degradation; the Studio surface: plain-language edit with diff
preview against the resident's files. First real model calls in product.

### Increment E. Stage 8, the Art Director

Daily rounds and the weekly composed note (worker jobs), interventions on
Monitor drop-offs, every claim citing evidence, silence otherwise. The
Owner console's hand-composed notes come in stage F. This is return-loop
fix 17 landing for real.

### Increment F. Stage 9, Owner console

Residents desk with god-view, Prompt studio (versioned, test-runnable
against SkyRecall, rollbackable), reference library, love and viral
dashboards, promotion desk, system health. Operated by a non-engineer:
every action is a sentence and a button.

### Increment G. Stage 10, signatures wave one

Motion identity (tokens to springs compiler), X-ray flip, Voice Director
lite, Taste Transfer lite, the Hallmark with its signed certificate page.

### Increment H. Stage 11, devices and stores

The wardrobe row on real frames, tablet and desktop compositions, watch
preview, the Capacitor-class wrap pipeline, the Living Store Kit
regenerating on change. The device switcher from this branch becomes the
wardrobe's front door.

### Increment I. Stages 12 to 15, in spec order

Ecosystem rail (per §10's logo laws), viral surfaces and audience-aware
Promote, Real Mode hardening (rate limits, isolation, degradation without
walls), then the 200-person drill, backup and cold-start rehearsals.

---

## Part 4. Risks

1. **Scope gravity.** Fifteen stages, ten signatures, one operator. The
   discipline that protects the schedule: one increment in flight, each
   ending green. (This plan's whole shape is that mitigation.)
2. **The single box.** One Apple Silicon machine serving 200 users:
   tunnel dies, disk fills, box reboots. Mitigation is spec'd: three
   alerts, nightly restore-drilled backups, cold-start rehearsal, and the
   change-of-address growth path.
3. **Model spend and latency** once Studio and the Art Director are live.
   Mitigation: the gateway's budgets, BYOK-first, degradation policy
   (never a wall, always a smaller answer).
4. **Design drift.** Every new surface risks diverging from the Figma
   files. Mitigation: tokens only from measured values, the Rams check in
   review, fidelity screenshots per increment.
5. **The addictive ask vs the no-manipulation law.** Resolved in Part 2:
   care loops, not hooks; the psychology lens applies to us too.
6. **Cloud sandbox limits** (this environment): figma.com egress is
   blocked, so binary asset export and the store-badge assets must come
   from a local session or an upload.

## Part 5. Alternatives considered

- **Next.js instead of SPA + API.** Rejected for the product canvas: the
  working surface is app-like, offline-friendly Demo Mode matters, and
  the spec names a modular monolith API. Public share pages (Vitality,
  Hallmark certificate, before-and-after) should still be server-rendered
  static HTML from `/api` for link unfurls, which covers SSR's real value
  here.
- **Supabase or managed cloud instead of the owned box.** Faster to
  stand up, but the spec decides own-hardware economics and the libSQL
  per-resident isolation model. Keep managed Postgres as the documented
  contingency in the growth path.
- **A state library (zustand or jotai) now.** Not yet; the single context
  is fine until Monitor goes live, and the store's API is already shaped
  so slicing it later is mechanical.
- **A component library.** Never; the design system is the product's
  face, and the bespoke CSS is 5 KB gzipped.

## Part 6. Migration strategy, demo to real, no rewrite

| Subsystem | Today (demo) | Real | Switch |
|---|---|---|---|
| SDK | localStorage transport | HTTP transport, same API | transport flag per resident |
| Examination | seeded ten lenses | worker job filling the same `Lens[]` shape | data source behind one fetch |
| Heal | seeded deltas | Studio-backed patches, same lifecycle states | same |
| Inbox | seed + local events | api events table, same sentence format | same |
| Monitor | seeded uptime and events | real probes and session beacons | same |
| Tabs | cosmetic | resident list from api, per-tab state | store slice |
| Promote | static, waitlist to local rows | waitlist to api, packages stay Opening soon | transport |

The rule that makes this work: **every view already consumes
seed-shaped data; the backend's job is to produce that shape.** Nothing
in the UI is rewritten, only fed.

## Part 7. The old prototype

`/Users/gleb/Documents/Osyle/OldPrototype` lives on your Mac; this cloud
session cannot read it. To analyze it, one of:

1. Zip it and upload it into the chat (fastest).
2. Push it to a GitHub repo and tell me its name; I attach it here.
3. Open a local Claude Code session in that folder for a summary I can use.

When it arrives, the review will look for: exam-lens heuristics or
prompts worth porting, any real user data shapes, the import pipeline if
one exists, and anything that shortens stage 2.

## Part 8. What approval unlocks

Approve any of these to start, one at a time, in this order by default:

1. **Increment A**, the P0 UX return-loop fixes plus committed tests.
2. **Increment B**, stage 2, the backend foundation.
3. Old prototype review, as soon as it reaches me by any route above.
