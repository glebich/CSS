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
  },
];

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

/** Vault surface numbers, generous and visible. */
export const quotas = {
  storage: { used: "412 MB", total: "10 GB" },
  bandwidth: { used: "1.8 GB", total: "100 GB" },
  dbRows: { used: "1,204", total: "500,000" },
};
