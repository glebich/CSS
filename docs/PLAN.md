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

### Increment B5. Never-empty value and the real residency. DELIVERED

Two direct orders honored at once: a report may never dead-end at zero
repairs, and Osyle must feel like a home, not an analyzer. Whole
folders now arrive intact, dropped anywhere (recursive directory walk,
node_modules and build output skipped) or through the folder picker,
and the project takes its folder's name. The typography and color
lenses read JavaScript styling too, so styled apps stop reading as
invisible. A clean report speaks plainly, offers the grounded
improvement prompt in place of the repair plan (Nielsen walkthrough,
state coverage, browser-run WCAG audit, Core Web Vitals budget, calm
copy pass), and names the lenses that could not see. And the report
now ends in a door: Give it the address persists the examined files
into the resident registry and the address genuinely serves them,
reassembled by the same document builder the preview frames use, in a
sandbox at #/r/{slug}, surviving reload, with an honest page for
addresses where nothing lives yet. The real journey's breadcrumb runs
Place, Materials, The report, The address. Verified end to end: the
flawed fixture moves in and serves at its address; a deliberately
clean fixture yields the improvement prompt, never a zero; 55 journey
checks pass.

### Increment B6. The deck alignment pass. DELIVERED

The investor deck (Osyle_Deck_E_Home_4) and the MLP doc re-read side by
side against the build, and the product adjusted where it drifted from
the story being told. The examination now reads as the deck says it
does, ten lenses under one number: the real report carries a lens
strip where the eight measured lenses show their scores, a lens that
could not see says so in place, and Backend and data plus Market and
benchmarks stand in the strip saying they arrive with their stage.
The landing carries the six promises from the deck, one quiet
uppercase line: Safe. Designed. Usable. Tested. Evolving. Shared. The
preview section takes the deck's exact heading, Same app. Two
futures. And the address ceremony closes on the deck's law: a tool
makes software, a home keeps it alive. 58 journey checks pass.

### Increment C. Stage 6, the Audience for real. DELIVERED

The Audience is now a surface of its own, reached from the life nav
and from the prompt bar. One screen, two ways in, as specified: a
sentence composes an archetype deterministically (name, portrait
line, context, motivation, fear, honest caption when interpreted
loosely), and discovery proposes three ranked audiences, each with
its evidence cited in one line, adopted in one tap. Up to three
archetypes per resident, one primary, persisted and recorded in the
Decision Ledger. The primary archetype carries the funnel dial: an
age band with two handles, trait toggles that each narrow the funnel,
and the reach numeral set large, easing toward its target and labeled
an estimate. Adaptation is wired and testable: the SkyRecall resident
reads the primary archetype and renders calm at an older midpoint,
dense at a younger one, exactly the criterion-39 demonstration. The
Promote summary now delivers against the live primary archetype
instead of a static line, with a door back to change the audience.
Targeting is age, context, and interest only, by construction; no
other control exists. One real bug found on the way: the reach
easing hook scheduled animation frames inside a state updater, which
StrictMode turns into an exponential frame storm; the loop moved into
the effect where it belongs. 67 journey checks pass.

### Increment D. Stage 7, Studio and BYOK. DELIVERED

The Studio surface, in the life nav with its own pen mark: say the
change in plain language, see the diff before anything moves, decide.
Demo Mode ships the scripted edit exactly as the spec's demo section
orders, three of them, deterministic, each labeled Scripted example
aloud: the streak surfaced in the logbook, the drill call stepped up
for cockpit glare with its WCAG citation, and the quiet weekly line
on home. Each edit renders a real readable diff (file, context,
removals struck, additions tinted), carries its why with evidence,
and states how it stays inside the identity. Apply writes the
decision to the ledger, remembers across sessions, and celebrates in
the one permitted line: Your app got better today. Set aside keeps
the diff reachable. An instruction the demo does not know gets an
honest answer naming what it does know. BYOK lands as the key sheet:
Claude and Gemini fields with format validation, keys stored on this
machine only, and the honest note that they power live edits when
Real Mode arrives with its stage. The model gateway with live calls,
budgets, and degradation remains with Real Mode hardening, where it
can be tested against a real network. 74 journey checks pass.

### Increment E. Stage 8, the Art Director. DELIVERED

The director has a name, Milan Rada, and a voice that arrives where
everything arrives: the one quiet stream. Three composed notes seed
the demo, each in the exact shape the Owner console will fill by hand
in the concierge era. The weekly review carries one suggestion with
its evidence cited (the attention lens's nine equal weights), one
attached action door, and the quotable line. The intervention lands
within the hour of the live stall, says what was done and why, and
doors to the monitor. And one rounds entry says the honest thing
nobody else says: nothing worth your attention today, 27 checks
quiet. Home carries the first-unprompted-note moment as a quiet pill
under the pulse line, gone once the note is read. Every claim cites
its evidence, and the composed-note data model is the concierge
interface, ready for stage 9's Owner console to write into. 80
journey checks pass.

Still ahead for the director when Real Mode arrives: the worker jobs
that run rounds on a clock instead of a seed.

### Increment F. Stage 9, Owner console. DELIVERED

The operator's room at #/owner, built for a non-engineer, and honest
to the bone: everything it shows is read from the same storage the
product writes. The residents desk holds god-view over the demo
resident (its style, applied studio edits, primary archetype, ledger
count, all live) and lists every moved-in app with its address and a
visit door. The composer writes a director note by hand, kind chosen,
evidence required, quote optional, and the note lands in the
product's Inbox unread and signed in Milan Rada's voice: the
concierge era working end to end, proven by a journey test that
composes in the console and reads the note in the stream. The Prompt
studio ships the three prompts Real Mode will run, versioned from
day one; editing writes a new version, rollback restores the one
before, and test runs say honestly that they arrive with Real Mode.
The growth board shows the six loops with the two measurable ones
measured (residents carrying the mark, director notes delivered) and
the rest labeled example until their share surfaces ship; the
promotion desk reads the real waitlist rows; health counts the real
local storage, keys, and ledger. 88 journey checks pass. The
reference library remains for the stage that gives it content.

### Increment G. Stage 10, signatures wave one. DELIVERED

Five signatures, each a real slice. Motion Identity: every style
category carries motion DNA (name, curve, duration, one line of
character), compiled into real CSS transitions on the resident and
into the report's after-frame, and spoken on the report. X-ray: the
x key or the footer door flips the live SkyRecall into blueprint
view, violet grid, dashed outlines, and a panel whose numbers are
measured, the ink and accent contrast computed with the engine's
WCAG math against the style's own tokens, type ramp, spacing, radius,
and motion listed. Voice Director lite: three registers in the
Studio, Calm, Warm, Precise, each a strings-only diff in the same
honest renderer as every Studio change, applyable to the ledger.
Taste Transfer lite: three admired patterns studied for their
principles, density, rhythm, tone, hierarchy, never their pixels,
each proposing a wearable identity variant; links arrive with Real
Mode and say so. The Hallmark: #/mark/{slug} renders the live
certificate as a brand surface, name, Vitality read from real state,
last examination, uptime, and a real SHA-256 content hash with the
honest line that the signing key arrives with Real Mode; unearned
slugs get no certificate. 99 journey checks pass.

### Increment G2. The repo door and the public address. DELIVERED

The product's own connectivity, both directions. Inward: people
connect the repository their app lives in, github.com/you/your-app
named on the Place screen, the zipball fetched client side and run
through the whole real examination, with an honest sentence for
unreachable or private repositories and the token flow named as
Real Mode's. Proven by stubbing GitHub at the network edge with a
real zip of the flawed fixture. Outward: a Pages workflow publishes
the built app to the gh-pages branch on every push, so the product
carries a public URL that people can open without anything installed,
and the Vite base went relative so one build serves anywhere.

### Increment G3. The make-it-real pass. DELIVERED

On the review note that demo text still leaked into real journeys:
with a real project open, the browser title, the tab chip, and the
home surface all speak the project's own name and numbers, the reset
door says Start over, and the example's furniture, heal doors, the
director's note, the since-you-left card, the ten-lens tip, stays in
the example where it belongs. 106 journey checks pass.

### Increment H1. Stage 11 first slice, the wardrobe and the store kit. DELIVERED

Moment eight arrives on the real report: the wardrobe, one app
wearing phone, desktop, and watch at once, the first two frames the
person's actual page at each device's width through the chosen
identity's tokens, the watch wearing the glance pattern, the app's
name and its one number. The tablet composition and native wrap
builds are named as arriving with their stage, on the surface
itself. And the kit downloads complete, per the spec's exact words:
from the real Address, one zip holding the app icon drawn from the
identity's real tokens as SVG, store copy written from what the
examination actually understood, metadata, and an honest preflight
that lists what still needs a human, screenshots, a privacy policy,
native builds, store accounts, plus the examination's own findings
named as rejection risks. Also fixed here: the artifact bundler was
corrupting the shipped JavaScript because String.replace treats
dollar patterns in replacements specially, which blanked the shared
demo page; injections now use function replacements and the bundle
is render-verified in Chromium before every publish. 109 journey
checks pass.

### Increment H. Stage 11, devices and stores

The wardrobe row on real frames, tablet and desktop compositions, watch
preview, the Capacitor-class wrap pipeline, the Living Store Kit
regenerating on change. The device switcher from this branch becomes the
wardrobe's front door.

### Increment I1. Stage 12, the Ecosystem Rail. DELIVERED

The room where everything already used finally connects, worn per
the logo behavior rules. The landing carries the Works with band,
eight nominative marks, GitHub, Lovable, Cursor, Claude, v0, Bolt,
Replit, Figma, single ink at reduced opacity, uniform, each with a
tooltip stating exactly what its integration does, never implying
endorsement. The Studio's key sheet marks carry their tooltips. The
connectors are real: the engine fingerprints services actually
present in the dropped text, Firebase, Supabase, Stripe, OpenAI,
Anthropic, Google APIs, AWS, and the report wears the detected
marks with quiet status dots and the honest note that live status
checks arrive with Real Mode. The repo door carries the GitHub
integration sentence. The official App Store and Google Play badges
are deferred to the publish stage on the rule's own terms: they may
appear only in their official form, and official assets cannot ship
from this build environment. 112 journey checks pass.

### Increment J1. Stage 13 first slice, the Report Card and referral. DELIVERED

Two of the six loops become touchable. The shareable Report Card is
a real PNG drawn on a canvas from real state only, the brand surface
frozen at its widest breath: near-black, the violet glow, the
letterspaced wordmark, the resident's name, the Vitality numeral,
one striking finding, and the address line. It downloads from the
real report in one tap; the percentile waits for the network's
density and is not invented. Referral in kind opens as the invite
door on the Address, copying the product link in one tap; the
in-product rewards begin counting with the network, and the door
says so by counting only what is real. The Owner console's growth
board now measures both loops with real local counts, cards
downloaded and invites copied, alongside the residents carrying the
mark and the director's notes. 116 journey checks pass.

### Increment K1. Stage 14 first slice, the Real Mode wire. DELIVERED

The switch stops being a promise. With Real Mode on, the app probes
the stack's /health once at open; the real Address then carries the
claim door, an email in, POST /partner/import out, and the resident
registers server side with its magic-link claim, the ceremony
confirming the registered address. An unreachable stack degrades to
one quiet sentence while everything local keeps working, which is
the doctrine. The Owner console's Health tab reads the stack's own
/health live, database, blobs, uptime, when Real Mode names a base.
The journey test now boots the actual Fastify API with a fresh data
directory, claims through the real browser flow, and verifies the
resident landed by reading the public Survival endpoint: the SPA and
the stack, talking for real. And the product's public address went
live during this increment: GitHub Pages now serves the gh-pages
branch the deploy workflow refreshes on every push. 119 journey
checks pass.

### Increment K2. The Vault claims the files. DELIVERED

Server-side residency stops at nothing halfway: when the stack claim
succeeds, the magic link verifies in place, the session lands, and
the resident's readable files move into the real Vault one by one,
each versioned from day one by the API's own insert-only versioning.
The ceremony reports the count honestly, and the count is real
because it counts 201s from the server, not intentions. The live-API
journey test asserts the three fixture files arrive. GitHub keeps
the code; the Vault now actually keeps the life. 120 journey checks
pass.

### Increment L. Discover, where residents are seen. DELIVERED

Addendum F's surface, honest to its bones: #/discover lists every
app that took an address on this machine, name, address chip,
Vitality, when it moved in and how many files it holds, with visit
and Hallmark doors, and the example resident wearing its Example
chip. The landing carries a quiet door, See who lives here. The
network's category showcases and transformation posts are named as
arriving with the density to fill them, on the surface itself. 124
journey checks pass.

### Increment M. The resident panel and the mobile floor. DELIVERED

On the review note that the app's own life was scattered: a side
panel now opens over any working screen from the quiet Your app door
in the top bar, the first-tier features of a repository host said in
human sentences and read from real state. The files it holds with
sizes and a copy-the-share-link door; the last update dated from the
Decision Ledger; the connection with the repository named, a real
open-pull-request count fetched from GitHub, and checks named as
arriving with the GitHub app stage; settings with a visibility
toggle Discover actually respects and a custom domain saved with the
honest DNS sentence; and security in plain words, everything local,
keys never leaving, sessions arriving with Real Mode. The Place
screen gains its mobile floor: half the decorative pills step back
at tablet widths and all of them on phones, and the doors stack full
width with no horizontal overflow at 390, tested. 135 journey checks
pass.

### Increment N. Honest materials: true pills, audio and images carried. DELIVERED

On the review question, is this text correct: it was not. The Place
cloud promised material types the intake could not take and repeated
two of them. The pills now say only what genuinely works, App
folder, Zip archive, GitHub repo, HTML, Styles, JavaScript, Images,
Audio, Readme, React Vue Svelte, Anything readable, each one a
working door, no duplicates. And Audio became true instead of being
deleted: dropped audio and images up to a stated cap, 1.5 MB for
sound and 400 KB for images, are carried whole as data URIs, inlined
into the served document so the resident actually plays and shows
them, persisted through the registry within a storage budget, with
svg travelling as its own text. Proven end to end with a genuine WAV
in the clean fixture, examined, given the address, and served
playing at #/r/clean. 136 journey checks pass.

### Increment O. The mobile floor for the whole journey. DELIVERED

Finishing what the mobile note started: the report's two futures
stack on phones, the wardrobe's desktop frame yields to the screen,
the wide ask inputs in the Studio and the Audience give way instead
of overflowing, the owner console's resident rows wrap, and the Your
app panel door stays reachable at phone width where the other quiet
top bar doors step aside, because the panel is the app's life. The
390 floor is now tested across the journey: the real report with its
stacked futures, place, discover, the hallmark, the owner console,
and the served resident, each asserted free of horizontal overflow.
The theater waits in the suite were hardened against the slower
runs the live API adds. 143 journey checks pass.

### Increment P. The home surface explains itself. DELIVERED

On the review notes that the 66 arrived without context, the heal
list hid behind a link, and the bar spoke in unlabeled icons. Home
is now the arrival: It lives here now leads the screen, and the
app is reachable right there, named, with its address chip, Open
your app, and Copy the link; a real project without an address gets
the door to the report's ending instead. Vitality follows with a
permanent plain sentence, health 0 to 100 across ten lenses, tap
for the why, replacing the dismissible tip. The heal step inverts:
the four issues are shown first as an open card with their lens
chips and the honest sentence about annotation, the one dark button
beneath them, no hidden link. And every icon in the bottom bar
carries its name in small type, Mood, People, Address, Monitor,
Inbox, SDK, Studio, Audience, Promote, so nobody decodes glyphs.
148 journey checks pass.

### Increment Q. The workspace: the app on the bench. DELIVERED

On the review direction that the product should feel like a
builder's room, chat, history, and the thing being built always in
view, not pages of text. Every resident view now carries the
workspace rail: the app rendered live in a phone frame on the
right, reacting to style, mood, persona, and comfort as they move,
with the address door beneath it and History, the last five
Decision Ledger entries spoken as human lines with their times.
The Mood and Personas panels lost their cramped thumbnails, the
clipped preview bug with them, and became pure controls; the panel
copy points at the bench. The SDK page now leads with The people
inside: your own live rows from this machine first, the three
example pilots labeled Example with what they did and when, and
the drop-off sentence with its door to the Monitor. The rail steps
aside below 1160 where the phone screens keep their floor. 151
journey checks pass.

### Increment R. The ask acts. DELIVERED

The prompt bar stops being a suggestion dispenser and becomes the
chat that drives the room. Typed words route deterministically:
an edit-shaped ask lands in the Studio with the ask already placed
and its diff found, a question about users lands with the people
inside, heal goes home, stall goes to the monitor, worth goes to
the findings desk, and the unrecognized rest lands honestly on the
examination. Every ask is recorded in the Decision Ledger and
appears in the workspace History as You asked, with its time. And
the findings desk went on the text diet the review asked for: the
worth is one line, an estimate said in place, the reasoning waiting
under the cursor. 154 journey checks pass.

### Increment S. The deployment runbook and a true edge. DELIVERED

The stack's front door now serves the product. The Caddyfile gives
the apex and the wildcard the built app with the single-page
fallback, and keeps the api at its own subdomain; compose mounts
the app build into the edge read-only. docs/DEPLOY.md walks a
non-engineer from a clean box to the live domain: the three DNS
records, one install command, two secrets, compose up, the health
check, connecting the app to the stack, a nightly backup line for
cron with a restore drill, the update flow that refuses to ship on
failing tests, and the honest boundaries named plainly, including
the one asset only a human with Figma access can export. Compose
YAML validated. No app code changed.

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
