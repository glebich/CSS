/**
 * Demo Mode seed: SkyRecall, a recall-drill app for pilots who fly rarely
 * and fear getting rusty. Deterministic and offline. Every number and
 * sentence here is the scripted demo from the build spec, including the
 * broken weather key.
 */

export interface Lens {
  key: string;
  name: string;
  weight: number;
  score: number;
  note: string;
}

export type IssueState = "new" | "recurring" | "regressed" | "healed";

export interface Issue {
  id: string;
  lens: string;
  title: string;
  detail: string;
  /** exam index (0-based) where the issue first appeared */
  firstSeen: number;
  /** lifecycle per examination, oldest first */
  history: IssueState[];
  /** Heal can fix it in one tap; false means Fix Prompt is the fallback */
  healable: boolean;
  /** points the owning lens gains when this heals */
  healGain: number;
  /** the why-annotation shown in the Reveal */
  why: string;
  /** estimated monthly value of fixing it, whole dollars, always an estimate */
  valueMonthly: number;
  /** where the estimate comes from, cited like every claim */
  valueWhy: string;
}

export interface Repair {
  id: string;
  what: string;
  why: string;
  lens: string;
}

export const resident = {
  name: "SkyRecall",
  slug: "skyrecall",
  address: "skyrecall.osyle.app",
  oneLiner: "Ten-minute recall drills for pilots who fly rarely.",
  category: "Aviation training",
  version: 7,
  importedFrom: "GitHub",
};

export const examDates = ["July 26", "August 2", "August 9"];

/** Ten lenses, one weighted Vitality. Weights sum to 1. */
export const lenses: Lens[] = [
  { key: "ux", name: "UX and flows", weight: 0.14, score: 72, note: "The first drill is four taps away. It should be one." },
  { key: "visual", name: "Interface and visual design", weight: 0.12, score: 68, note: "Two type ramps compete. The identity wants one." },
  { key: "attention", name: "Predicted attention", weight: 0.1, score: 61, note: "Saliency pools on the streak banner, not the start button. CTA verdict: contested." },
  { key: "psychology", name: "Psychology and behavior", weight: 0.1, score: 83, note: "Clean after the guilt banner was removed. No dark patterns remain." },
  { key: "code", name: "Code quality", weight: 0.1, score: 70, note: "Small and readable. Timer state lives in memory it should not." },
  { key: "backend", name: "Backend and data", weight: 0.08, score: 66, note: "Drill history is client-only. One crash loses the logbook." },
  { key: "apis", name: "APIs and connectors", weight: 0.09, score: 38, note: "The weather briefing key has been invalid for 14 days. Every session that reaches weather stalls." },
  { key: "performance", name: "Performance and accessibility", weight: 0.09, score: 59, note: "Runway card contrast fails AA at 3.1 to 1. Sunlight is the cockpit condition." },
  { key: "value", name: "Value and clarity", weight: 0.09, score: 77, note: "SkyRecall is a memory instrument for pilots whose licence outlives their practice. It drills the recall that decays first, radio calls, checklists, airspace rules, in sessions short enough to survive a workday. The product knows exactly who it serves. Its opening screen does not say so yet." },
  { key: "market", name: "Market and benchmark", weight: 0.09, score: 64, note: "61st percentile among refresher tools. Ahead on session length, behind on offline drills. Closest comparable: RustyWings." },
];

export const issues: Issue[] = [
  {
    id: "weather-key",
    lens: "apis",
    title: "The weather briefing key is invalid",
    detail: "Calls to the METAR provider return 401. Four of nine live sessions stalled at the briefing step this week.",
    firstSeen: 0,
    history: ["new", "recurring", "recurring"],
    healable: false,
    healGain: 0,
    why: "A dead key cannot be healed from here. The Fix Prompt carries the exact call, the header that fails, and where a fresh key goes.",
    valueMonthly: 310,
    valueWhy: "Four of nine sessions stall at the briefing. Recovered at your category's completion rate, about $310 a month, an estimate.",
  },
  {
    id: "runway-contrast",
    lens: "performance",
    title: "Runway card contrast fails AA",
    detail: "Ink on the runway cards measures 3.1 to 1. The floor is 4.5 to 1.",
    firstSeen: 0,
    history: ["new", "healed", "regressed"],
    healable: true,
    healGain: 8,
    why: "Contrast was raised to 4.6 to 1. Runway numbers must read in direct sunlight, which is the cockpit condition, not the office one.",
    valueMonthly: 120,
    valueWhy: "Contrast failures suppress outdoor completions. Category data prices this near $120 a month, an estimate.",
  },
  {
    id: "timer-reset",
    lens: "code",
    title: "The checkride timer resets on refresh",
    detail: "Timer state lives in component memory. A reload during a drill silently discards the attempt.",
    firstSeen: 1,
    history: ["new", "recurring"],
    healable: true,
    healGain: 6,
    why: "The timer now persists to the resident database each tick. An interrupted drill resumes where it stopped, because losing a timed attempt reads as losing progress.",
    valueMonthly: 95,
    valueWhy: "Interrupted drills read as lost progress and quietly end returns. About $95 a month, an estimate.",
  },
  {
    id: "empty-state",
    lens: "ux",
    title: "The empty state gives no first step",
    detail: "A new pilot lands on a blank logbook with no way in.",
    firstSeen: 2,
    history: ["new"],
    healable: true,
    healGain: 5,
    why: "The blank logbook now offers one line and one action: start the radio-call drill. First sessions need a runway, not a lobby.",
    valueMonthly: 140,
    valueWhy: "First sessions that find no first step rarely become second sessions. About $140 a month, an estimate.",
  },
  {
    id: "cta-contest",
    lens: "attention",
    title: "Three actions compete with the drill button",
    detail: "Predicted attention splits across the streak banner, settings, and the start button. The start button loses.",
    firstSeen: 1,
    history: ["new", "recurring"],
    healable: true,
    healGain: 7,
    why: "The streak banner stepped back to a quiet line and settings left the first screen. One screen, one verb: begin the drill.",
    valueMonthly: 180,
    valueWhy: "A contested primary action costs first drills. At your traffic, about $180 a month, an estimate.",
  },
  {
    id: "guilt-banner",
    lens: "psychology",
    title: "The streak banner shamed missed days",
    detail: "A lapse message leaned on guilt to drive return visits.",
    firstSeen: 0,
    history: ["new", "healed", "healed"],
    healable: true,
    healGain: 0,
    why: "Manipulation was removed, not softened. A pilot who returns after a month is greeted, not scolded, because fear is already why they are here.",
    valueMonthly: 0,
    valueWhy: "Already healed. Its value is the trust that stays.",
  },
];

/** What is genuinely good, said plainly. Findings praise software too. */
export interface Strength {
  id: string;
  title: string;
  why: string;
  lens: string;
}

export const strengths: Strength[] = [
  { id: "str-psych", lens: "psychology", title: "No manipulation anywhere", why: "The guilt banner is gone and nothing took its place. Returning pilots are greeted, not scolded. This is rarer than it should be." },
  { id: "str-length", lens: "market", title: "Session length beats the category", why: "Six-minute median drills against a nine-minute category norm. Short enough to survive a workday, which is the whole promise." },
  { id: "str-clarity", lens: "value", title: "The product knows who it serves", why: "A memory instrument for pilots whose licence outlives their practice. Few products can be described in one honest sentence. This one can." },
];

/** The exact prompt for the one fix that needs a human hand. */
export const fixPrompt = `SkyRecall, weather briefing connector.
The METAR provider returns 401 Unauthorized on every call.

Failing call:
  GET https://api.metar.example/v1/brief?icao=KSFO
  Header: Authorization: Bearer <WEATHER_KEY>

What to do:
1. Issue a fresh key in the provider console.
2. Set WEATHER_KEY in the resident settings, connectors, weather.
3. The connector re-checks within a minute. The lens re-scores on the
   next examination.`;

/** Repairs shown in the Reveal, the accepted transformation's annotations. */
export const repairs: Repair[] = [
  {
    id: "rep-contrast",
    lens: "performance",
    what: "Runway card ink raised to 4.6 to 1",
    why: "Runway numbers must read in direct sunlight, which is the cockpit condition, not the office one.",
  },
  {
    id: "rep-cta",
    lens: "attention",
    what: "One primary action per screen, the drill button",
    why: "Attention pooled on the streak banner. The screen now spends its single dark element on the thing pilots came to do.",
  },
  {
    id: "rep-empty",
    lens: "ux",
    what: "The blank logbook opens with one line and one action",
    why: "First sessions need a runway, not a lobby. The shortest path to a first completed drill is the whole onboarding.",
  },
  {
    id: "rep-type",
    lens: "visual",
    what: "One type ramp, four sizes, nothing else",
    why: "Two ramps read as two products. A memory instrument should feel like one calm instrument panel.",
  },
];

export const pulseLineAtRest =
  "Steady, one connector down, two quiet wins waiting.";

export const pulseLineAfterHeal = "Rising. Your app got better today.";

export interface InboxEntry {
  id: string;
  when: string;
  text: string;
  read: boolean;
}

export const inboxSeed: InboxEntry[] = [
  { id: "in-1", when: "August 9, 09:12", text: "Your third examination finished. Vitality held at 66. One regression: runway contrast slipped back below AA.", read: false },
  { id: "in-2", when: "August 9, 09:12", text: "The weather briefing key failed its check again, day 14. The Fix Prompt is ready when you are.", read: false },
  { id: "in-3", when: "August 5, 16:40", text: "Four of nine sessions stalled at the weather briefing since 14:00. The broken key is the likely cause.", read: true },
  { id: "in-4", when: "August 2, 09:05", text: "Your second examination finished. Vitality rose 4 points. The guilt banner is gone and psychology is your strongest lens.", read: true },
  { id: "in-5", when: "July 29, 11:30", text: "skyrecall.osyle.app is live. Files, versions, and your resident database are in place.", read: true },
  { id: "in-6", when: "July 26, 10:14", text: "Your first examination finished. Vitality 62. The full report is on your desk, all ten lenses.", read: true },
];

export interface MonitorEvent {
  id: string;
  when: string;
  kind: "dropoff" | "recovery" | "quiet";
  text: string;
}

export const monitorEvents: MonitorEvent[] = [
  { id: "ev-1", when: "Today, 14:00", kind: "dropoff", text: "Four of nine sessions stalled at the weather briefing. The invalid key is the likely cause." },
  { id: "ev-2", when: "Yesterday, 20:15", kind: "quiet", text: "Evening drills completed clean. Median session, six minutes." },
  { id: "ev-3", when: "August 6, 07:40", kind: "recovery", text: "The morning slowdown resolved itself. Cold cache, not a fault." },
];

/** 30 days of uptime, one cell per day. true means clean. */
export const uptimeDays: boolean[] = Array.from({ length: 30 }, (_, i) => i !== 21);

/** Response times for the sparkline, ms, oldest first. */
export const responseMs: number[] = [
  84, 88, 82, 90, 86, 84, 96, 210, 120, 92, 88, 86, 84, 88, 90, 86, 84, 82,
  86, 88, 92, 88, 86, 84,
];

export const promoteTiers = [
  { views: "1,000", leads: "40", timeline: "about a week" },
  { views: "10,000", leads: "400", timeline: "two to three weeks" },
  { views: "100,000", leads: "4,000", timeline: "one to two months" },
  { views: "1,000,000", leads: "40,000", timeline: "a season" },
];

export const audienceSummary = {
  name: "The professional refresher",
  portrait: "Pilots who fly rarely and fear getting rusty",
  ageRange: "35 to 60",
  reach: "about 2.1M people fit this",
  rationale: "Your completion rate among returning users fits the professional refresher pattern, not the student pattern.",
};

/* ------------------------------------------------------------------------
   The materials SkyRecall arrived with, and what the system understood.
   Shown as cards in the upload flow: first sweeping with the gradient
   while reading, then resting as understood previews.
------------------------------------------------------------------------ */

export interface Material {
  id: string;
  name: string;
  size: string;
  kind: "doc" | "image" | "video" | "fig" | "link" | "sheet";
  /** the sentence proving the system read it */
  understood: string;
}

export const materials: Material[] = [
  { id: "m-brief", name: "Brand brief.pdf", size: "2.3 mb", kind: "doc", understood: "Minimal instrument for rusty pilots. Calm authority, no gamification, sunlight-legible. The word chosen for the feeling is steady." },
  { id: "m-flows", name: "User flows.doc", size: "1.4 mb", kind: "doc", understood: "Three flows: radio-call drill, checkride timer, weather briefing. The drill is the heart, two screens deep." },
  { id: "m-mood", name: "Moodboard.fig", size: "18 mb", kind: "fig", understood: "Cockpit metal, dawn light, dial typography. Cool blues over warm paper. Instruments, never dashboards." },
  { id: "m-shots", name: "Cockpit shots.png", size: "5.1 mb", kind: "image", understood: "Nine reference photos. Strong horizon lines, glare on glass, the readability problem stated in pictures." },
  { id: "m-walk", name: "Walkthrough.mov", size: "128 mb", kind: "video", understood: "A four-minute session recording. The stall at the weather step is visible at 2:41." },
  { id: "m-users", name: "Pilots.xlsx", size: "0.6 mb", kind: "sheet", understood: "214 rows of beta pilots. Median age 47, median hours flown this year, nine. The refresher pattern, in numbers." },
  { id: "m-site", name: "skyrecall.app", size: "live", kind: "link", understood: "The current production build. Ten screens crawled, three flows mapped, one broken connector found." },
  { id: "m-spec", name: "Product spec.pdf", size: "5.9 mb", kind: "doc", understood: "Sessions must survive interruptions. Offline drills are promised for autumn. The spec already knows its audience." },
];

/* ------------------------------------------------------------------------
   The style catalog for Explore a style. Swatches are drawn in CSS,
   honest placeholders until the network gallery exists.
------------------------------------------------------------------------ */

export interface StyleCard {
  id: string;
  name: string;
  by: string;
  category: "Minimalism" | "Editorial" | "Dark Pro" | "Glass" | "Material" | "Brutalism";
  dark: boolean;
  /** CSS background for the preview tile */
  swatch: string;
  ink: string;
  accent: string;
  /** corner radius of the style's components */
  radius: number;
  tall?: boolean;
}

export const styleCategories = [
  "Minimalism",
  "Editorial",
  "Dark Pro",
  "Glass",
  "Material",
  "Brutalism",
] as const;

/**
 * The four StyleModels are real token systems, binding per the spec's
 * addendum: the same structured screens render through their tokens, so
 * switching is instant and flows are provably unchanged.
 */
export const styleCatalog: StyleCard[] = [
  { id: "st-aria", name: "Aria", by: "Osyle", category: "Minimalism", dark: false, swatch: "linear-gradient(160deg, #fdfdfd 0%, #f2f2f4 100%)", ink: "#1C1C1E", accent: "#0A84FF", radius: 10, tall: true },
  { id: "st-mono", name: "Mono Studio", by: "Osyle", category: "Minimalism", dark: false, swatch: "linear-gradient(160deg, #FAFAF8 0%, #f0f0ec 100%)", ink: "#222222", accent: "#222222", radius: 2 },
  { id: "st-warm", name: "Warm Counsel", by: "Osyle", category: "Editorial", dark: false, swatch: "linear-gradient(160deg, #f7f0e4 0%, #efe2cd 100%)", ink: "#3d2b1f", accent: "#c46a4a", radius: 14, tall: true },
  { id: "st-night", name: "Night Shift", by: "Osyle", category: "Dark Pro", dark: true, swatch: "linear-gradient(160deg, #0E0E12 0%, #1a1a22 100%)", ink: "#F2F2F4", accent: "#8B7FE8", radius: 8 },
  { id: "st-paper", name: "Paper Instrument", by: "Studio Norm", category: "Minimalism", dark: false, swatch: "linear-gradient(160deg, #f4f2ee 0%, #e8e4dd 100%)", ink: "#18202c", accent: "#18202c", radius: 12, tall: true },
  { id: "st-cockpit", name: "Cockpit Night", by: "Aft Cabin", category: "Dark Pro", dark: true, swatch: "linear-gradient(160deg, #0c0f14 0%, #1a2230 100%)", ink: "#e8ecf4", accent: "#5b8cff", radius: 10 },
  { id: "st-glass", name: "Glass Air", by: "Lumen", category: "Glass", dark: false, swatch: "linear-gradient(140deg, #dfe6f2 0%, #c6d4ec 55%, #eef2f9 100%)", ink: "#25304a", accent: "#4a6cf7", radius: 16, tall: true },
  { id: "st-editorial", name: "Field Notes", by: "Herald", category: "Editorial", dark: false, swatch: "linear-gradient(160deg, #f1ede4 0%, #ddd3c0 100%)", ink: "#221f1a", accent: "#8a3324", radius: 8 },
  { id: "st-terminal", name: "Terminal Green", by: "Aft Cabin", category: "Dark Pro", dark: true, swatch: "linear-gradient(160deg, #0a0d0a 0%, #14211a 100%)", ink: "#d7f2df", accent: "#59d47f", radius: 6 },
  { id: "st-material", name: "Material Calm", by: "Grid Nine", category: "Material", dark: false, swatch: "linear-gradient(160deg, #eef1f4 0%, #dfe7ee 100%)", ink: "#1f2a33", accent: "#2e6df6", radius: 12 },
  { id: "st-brutal", name: "Runway Mono", by: "Blok", category: "Brutalism", dark: false, swatch: "repeating-linear-gradient(45deg, #efece7 0 22px, #e3ded6 22px 24px)", ink: "#111111", accent: "#111111", radius: 2 },
  { id: "st-dusk", name: "Approach Dusk", by: "Lumen", category: "Glass", dark: true, swatch: "linear-gradient(160deg, #1a1626 0%, #3c2f56 60%, #6e5a8e 100%)", ink: "#efeaf8", accent: "#b9a5ff", radius: 16, tall: true },
  { id: "st-signal", name: "Signal Amber", by: "Herald", category: "Dark Pro", dark: true, swatch: "linear-gradient(160deg, #14100a 0%, #2c2010 100%)", ink: "#f4e8d4", accent: "#e8a13d", radius: 8 },
  { id: "st-swiss", name: "Swiss White", by: "Studio Norm", category: "Minimalism", dark: false, swatch: "linear-gradient(160deg, #ffffff 0%, #f0f0f0 100%)", ink: "#000000", accent: "#d92b2b", radius: 4 },
  { id: "st-ocean", name: "Coastline", by: "Grid Nine", category: "Material", dark: false, swatch: "linear-gradient(160deg, #e8f0f2 0%, #c9dde2 55%, #a9c8d2 100%)", ink: "#173038", accent: "#1f7a8c", radius: 12, tall: true },
  { id: "st-ledger", name: "Ledger Black", by: "Blok", category: "Brutalism", dark: true, swatch: "linear-gradient(160deg, #101010 0%, #232323 100%)", ink: "#f2f2f2", accent: "#ffd400", radius: 2 },
];

/* ------------------------------------------------------------------------
   Visual personas: the audience, as people you can look at.
   Portraits are drawn gradients, honest until photography exists.
------------------------------------------------------------------------ */

export interface Persona {
  id: string;
  name: string;
  age: number;
  role: string;
  line: string;
  portrait: string;
  reach: string;
}

export const personas: Persona[] = [
  { id: "p-maria", name: "Maria Chen", age: 51, role: "Airline captain", line: "Flies twice a quarter and feels the rust in week three", portrait: "linear-gradient(150deg, #93a9c4 0%, #4c6785 55%, #253549 100%)", reach: "about 2.1M people fit this" },
  { id: "p-tom", name: "Tom Alvarez", age: 38, role: "Private pilot", line: "Weekend flyer, weather is the thing he rehearses least", portrait: "linear-gradient(150deg, #d9b08a 0%, #a97a4e 55%, #5e3f24 100%)", reach: "about 3.4M people fit this" },
  { id: "p-priya", name: "Priya Nair", age: 29, role: "Student pilot", line: "Checkride in June, drills on the train home", portrait: "linear-gradient(150deg, #b3a5e8 0%, #7b6bff 55%, #3d3480 100%)", reach: "about 1.2M people fit this" },
];

/**
 * The feeling mapping, deterministic per the spec's addendum: words in,
 * a StyleModel and mood out, with an honest caption when we interpreted.
 */
export interface FeelingResult {
  styleId: string;
  mood: { energy: number; style: number; tone: number };
  comfort: boolean;
  caption: string | null;
}

export function mapFeeling(text: string): FeelingResult {
  const t = text.toLowerCase();
  if (/(grand|parent|mom|older|senior)/.test(t)) {
    return {
      styleId: "st-warm",
      mood: { energy: 15, style: 15, tone: 60 },
      comfort: true,
      caption: "Bigger, calmer, slower",
    };
  }
  if (/minimal/.test(t)) {
    return { styleId: "st-mono", mood: { energy: 25, style: 10, tone: 70 }, comfort: false, caption: null };
  }
  if (/bold/.test(t)) {
    return { styleId: "st-night", mood: { energy: 70, style: 80, tone: 55 }, comfort: false, caption: null };
  }
  if (/calm/.test(t)) {
    return { styleId: "st-warm", mood: { energy: 15, style: 25, tone: 60 }, comfort: false, caption: null };
  }
  return {
    styleId: "st-warm",
    mood: { energy: 15, style: 25, tone: 60 },
    comfort: false,
    caption: "Interpreted as: calmer",
  };
}

/**
 * Criterion 28: the examination ends with one sentence of genuine
 * understanding that proves the system read the app.
 */
export const examClosing =
  "SkyRecall is not a study app; it is a confidence instrument. Pilots do not open it to learn, they open it to stop doubting, and every screen that delays that reassurance is working against the product.";

/**
 * The Analysis Theater script: six phases streaming at a human cadence,
 * deterministic timings, about 45 seconds end to end, a ghost Skip for
 * rehearsal. Lines mark what the understanding panel learns.
 */
export interface TheaterLine {
  phase: "Reassemble" | "Errors" | "Strategy" | "UX" | "Design" | "Plan";
  text: string;
  /** ms after the previous line */
  delay: number;
  addScreens?: string[];
  addFlows?: string[];
  addIssues?: number;
}

export const theaterScript: TheaterLine[] = [
  { phase: "Reassemble", text: "Reading files", delay: 600 },
  { phase: "Reassemble", text: "Reconstructing the application", delay: 900 },
  { phase: "Reassemble", text: "Found the drill screen", delay: 900, addScreens: ["Drill"] },
  { phase: "Reassemble", text: "Found the logbook", delay: 800, addScreens: ["Logbook"] },
  { phase: "Reassemble", text: "Found the weather briefing", delay: 800, addScreens: ["Briefing"] },
  { phase: "Reassemble", text: "3 screens, 2 flows", delay: 900, addFlows: ["Radio-call drill", "Weather briefing"] },
  { phase: "Errors", text: "Checking for breakage", delay: 2000 },
  { phase: "Errors", text: "The weather key answers 401, every call", delay: 1400, addIssues: 1 },
  { phase: "Errors", text: "One fragile dependency, the METAR client", delay: 1100 },
  { phase: "Strategy", text: "This is not a study app. It is a confidence instrument.", delay: 2400 },
  { phase: "Strategy", text: "Pilots open it to stop doubting, not to learn.", delay: 1600 },
  { phase: "UX", text: "Walking the first-time path", delay: 2000 },
  { phase: "UX", text: "The first drill is four taps away", delay: 1400, addIssues: 1 },
  { phase: "UX", text: "Simulating a stressed user before a checkride", delay: 1500 },
  { phase: "UX", text: "The blank logbook offers no first step", delay: 1400, addIssues: 1 },
  { phase: "UX", text: "An interrupted drill loses its timer", delay: 1300, addIssues: 1 },
  { phase: "Design", text: "Auditing type, spacing, color, states", delay: 2000 },
  { phase: "Design", text: "Runway numbers fail in sunlight, 3.1 to 1", delay: 1500, addIssues: 1 },
  { phase: "Design", text: "Three actions compete with the one that matters", delay: 1400, addIssues: 1 },
  { phase: "Plan", text: "Weighing ten lenses", delay: 2200 },
  { phase: "Plan", text: "Writing your plan", delay: 1400 },
  { phase: "Plan", text: "Done. Six findings, each priced, each yours to decide.", delay: 1600 },
];

/**
 * What the prompt bar suggests. Every suggestion is a door that
 * actually opens: tapping one navigates to the surface that answers it.
 * No dead inputs anywhere.
 */
export const promptSuggestions: Array<{ text: string; view: string }> = [
  { text: "Why is attention split on the home screen", view: "exam" },
  { text: "What is worth fixing first", view: "findings" },
  { text: "Show me both futures", view: "transform" },
  { text: "Show me the weather stall", view: "monitor" },
  { text: "What happened while I was away", view: "inbox" },
];

/** The launch review, assembled from everything chosen. */
export const launchReview = {
  goal: "A recall instrument for pilots who fly rarely, drills short enough to survive a workday",
  success: "A pilot completes a first drill and returns within a week",
  screens: [
    { name: "Drill screen", detail: "4 components, 8 states" },
    { name: "Logbook", detail: "3 components, 5 states" },
    { name: "Weather briefing", detail: "5 components, 6 states" },
  ],
};

/** Vault surface numbers, generous and visible. */
export const quotas = {
  storage: { used: "412 MB", total: "10 GB" },
  bandwidth: { used: "1.8 GB", total: "100 GB" },
  dbRows: { used: "1,204", total: "500,000" },
};
