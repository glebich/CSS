import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "./sdk/osyle";
import {
  composeArchetype,
  issues,
  lenses,
  mapFeeling,
  personas,
  resident,
  routeAsk,
  seedArchetype,
  styleCatalog,
  type Archetype,
  type InboxEntry,
  type Persona,
  inboxSeed,
} from "./data/seed";
import { analyzeProject, filesFromInput, type DroppedFile } from "./engine/analyze";
import { fetchRepoZip, parseRepoUrl } from "./engine/github";
import type { AnalyzedProject, ProgressLine } from "./engine/types";

export type View =
  | "landing"
  | "place"
  | "assets"
  | "style"
  | "launch"
  | "home"
  | "exam"
  | "findings"
  | "report"
  | "transform"
  | "reveal"
  | "issues"
  | "address"
  | "monitor"
  | "inbox"
  | "sdk"
  | "promote"
  | "audience"
  | "studio";

export type Device = "mobile" | "desktop" | "website" | "watch";

export interface Mood {
  /** 0 calm, 100 energetic */
  energy: number;
  /** 0 minimal, 100 bold */
  style: number;
  /** 0 playful, 100 serious */
  tone: number;
}

export interface Tab {
  id: string;
  name: string;
  /** only the demo resident carries the full life */
  isDemo: boolean;
}

const HEALED_KEY = "osyle.demo.healed";
const ACCEPT_KEY = "osyle.demo.transformAccepted";
const STYLE_KEY = "osyle.demo.style";
const MOOD_KEY = "osyle.demo.mood";
const PERSONA_KEY = "osyle.demo.persona";
const SEEN_KEY = "osyle.demo.seenTips";
const LAST_SEEN_KEY = "osyle.demo.lastSeen";
const LAUNCHED_KEY = "osyle.demo.launched";
const DECISIONS_KEY = "osyle.demo.findingDecisions";
const LEDGER_KEY = "osyle.demo.ledger";
const COMFORT_KEY = "osyle.demo.comfort";
const CAPTION_KEY = "osyle.demo.feelingCaption";
const AUDIENCE_KEY = "osyle.demo.audience";
const STUDIO_KEY = "osyle.demo.studioApplied";

export interface LedgerEntry {
  at: string;
  kind: string;
  detail: Record<string, unknown>;
}

/**
 * The Decision Ledger: every judgment made in the product, captured as
 * training signal with its context. Append-only, resident-scoped,
 * owner-exportable through the Address. It cannot be reconstructed
 * later, so it exists from day one.
 */
export function appendLedger(kind: string, detail: Record<string, unknown>): void {
  const entries = loadJson<LedgerEntry[]>(LEDGER_KEY, []);
  entries.push({ at: new Date().toISOString(), kind, detail });
  saveJson(LEDGER_KEY, entries);
}

export function readLedger(): LedgerEntry[] {
  return loadJson<LedgerEntry[]>(LEDGER_KEY, []);
}

/** Away long enough that the resident has a story to tell. */
const RETURN_AFTER_MS = 4 * 60 * 60 * 1000;

export const sdk = createClient(resident.slug);

/** Storage that cannot crash the product: private mode, sandboxes, all of it. */
function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* the session still works, it just forgets */
  }
}

function dropKeys(keys: string[]): void {
  try {
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* nothing to forget */
  }
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** An archetype as carried by the resident: dial and traits included. */
export interface StoredArchetype extends Archetype {
  activeTraits: string[];
  /** the rationale it was adopted on, when discovery proposed it */
  adoptedWhy: string | null;
}

export interface AudienceState {
  archetypes: StoredArchetype[];
  primaryId: string;
}

const defaultAudience = (): AudienceState => ({
  archetypes: [{ ...seedArchetype, activeTraits: [], adoptedWhy: null }],
  primaryId: seedArchetype.id,
});

export function currentState(issueId: string, healed: Set<string>) {
  const issue = issues.find((i) => i.id === issueId);
  if (!issue) return "new";
  if (healed.has(issueId)) return "healed";
  return issue.history[issue.history.length - 1];
}

/** A unit of work the interface admits to doing, live in the stack. */
export interface Job {
  id: string;
  title: string;
  detail: string | null;
  /** 0..1 when the steps are countable, null when they are not */
  progress: number | null;
  state: "working" | "done" | "failed";
  startedAt: number;
}

interface Store {
  view: View;
  go: (v: View) => void;
  /* tabs, like a browser, up to ten */
  tabs: Tab[];
  activeTab: string;
  switchTab: (id: string) => void;
  addTab: () => void;
  closeTab: (id: string) => void;
  /* the upload flow */
  uploadPhase: "idle" | "reading" | "understood";
  beginUpload: (droppedName?: string) => void;
  /** the theater calls this when its last line lands, or on Skip */
  finishReading: () => void;
  droppedName: string | null;
  /** the name of a real drop being read right now, before the project exists */
  pendingDrop: string | null;
  /* the real engine: an actually analyzed project, or null for the example */
  project: AnalyzedProject | null;
  analyzeFiles: (dropped: DroppedFile[]) => Promise<void>;
  /** connect a GitHub repo; resolves to a human error sentence, or null */
  analyzeRepo: (text: string) => Promise<string | null>;
  /* Real Mode: the stack, probed and spoken to honestly */
  stack: { on: boolean; up: boolean | null; base: string };
  stackClaim: { address: string; note: string; uploaded: number } | null;
  claimOnStack: (email: string) => Promise<string | null>;
  /** the residency: persist the dropped app and serve it at its address */
  realSlug: string | null;
  giveAddress: () => void;
  progress: ProgressLine[];
  realDecisions: Record<string, "accepted" | "aside">;
  decideReal: (findingId: string, decision: "accepted" | "aside") => void;
  /* journey clarity */
  seenTips: Set<string>;
  markTipSeen: (tip: string) => void;
  /** set when arriving from Launch so Home can perform the reveal once */
  justLaunched: boolean;
  clearLaunchArrival: () => void;
  goHomeFromLaunch: () => void;
  /** true when the user has been away long enough for a story */
  returned: boolean;
  dismissReturn: () => void;
  /* style, mood, persona, device */
  styleId: string;
  setStyleId: (id: string) => void;
  mood: Mood;
  setMood: (m: Partial<Mood>) => void;
  /** the feeling road: words in, style and mood out, honestly captioned */
  applyFeeling: (text: string) => void;
  comfort: boolean;
  feelingCaption: string | null;
  ledgerCount: number;
  personaId: string;
  setPersonaId: (id: string) => void;
  /* the people: the seeded three to start, then yours, all editable */
  people: Persona[];
  updatePersona: (id: string, patch: Partial<Omit<Persona, "id">>) => void;
  addPersona: () => string;
  /* the launch review speaks your words once you rewrite a row */
  launchGoal: string | null;
  setLaunchGoal: (t: string | null) => void;
  launchSuccess: string | null;
  setLaunchSuccess: (t: string | null) => void;
  /* the Audience: archetypes, one primary, dial state per archetype */
  /* the Studio: scripted edits applied by consent, remembered */
  appliedEdits: string[];
  applyEdit: (id: string) => void;
  /* the ask bar acts: words route the room, recorded in the ledger */
  ask: (text: string) => void;
  pendingAsk: string | null;
  clearPendingAsk: () => void;
  audience: AudienceState;
  describeAudience: (text: string) => void;
  adoptArchetype: (a: Archetype, rationale: string) => void;
  setPrimaryArchetype: (id: string) => void;
  removeArchetype: (id: string) => void;
  setArchetypeRange: (id: string, range: [number, number]) => void;
  toggleArchetypeTrait: (id: string, trait: string) => void;
  device: Device;
  setDevice: (d: Device) => void;
  /* floating panels */
  panel: "none" | "mood" | "personas" | "run" | "resident";
  togglePanel: (p: "mood" | "personas" | "run" | "resident") => void;
  /* the findings desk: one decision per finding, then back to rest */
  decisions: Record<string, "accepted" | "aside">;
  decide: (issueId: string, decision: "accepted" | "aside") => void;
  restoreAside: () => void;
  /* the examination and heal */
  healed: Set<string>;
  healing: boolean;
  heal: () => void;
  healableOpen: string[];
  vitality: number;
  lensScore: (key: string) => number;
  inbox: InboxEntry[];
  markRead: (id: string) => void;
  transformAccepted: boolean;
  acceptTransform: () => void;
  resetDemo: () => void;
  /** rename the resident in place, Figma style, and the rooms follow */
  renameResident: (name: string) => void;
  /* the file room: add, replace, and edit the files after the drop */
  mergeFiles: (dropped: DroppedFile[], replacePath?: string) => Promise<void>;
  saveFileText: (path: string, text: string) => Promise<void>;
  /* the work speaks: every working door files a job in the stack */
  jobs: Job[];
  beginJob: (title: string, detail?: string) => string;
  updateJob: (id: string, patch: { progress?: number; detail?: string }) => void;
  endJob: (id: string, line?: string, failed?: boolean) => void;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("store missing");
  return s;
}

const DEMO_TAB: Tab = { id: "tab-skyrecall", name: "SkyRecall", isDemo: true };

export function StoreProvider({ children }: { children: ReactNode }) {
  /* Coming back opens the resident, not the brochure. */
  const [view, setView] = useState<View>(() =>
    loadJson<boolean>(LAUNCHED_KEY, false) ? "home" : "landing",
  );
  const [tabs, setTabs] = useState<Tab[]>([DEMO_TAB]);
  const [activeTab, setActiveTab] = useState(DEMO_TAB.id);
  const [uploadPhase, setUploadPhase] = useState<"idle" | "reading" | "understood">("idle");
  const [project, setProject] = useState<AnalyzedProject | null>(null);
  const [progress, setProgress] = useState<ProgressLine[]>([]);
  const [realDecisions, setRealDecisions] = useState<Record<string, "accepted" | "aside">>({});
  const [styleId, setStyleIdRaw] = useState(() => loadJson(STYLE_KEY, "st-paper"));
  const [mood, setMoodRaw] = useState<Mood>(() =>
    loadJson<Mood>(MOOD_KEY, { energy: 30, style: 25, tone: 65 }),
  );
  const [personaId, setPersonaIdRaw] = useState(() => loadJson(PERSONA_KEY, "p-maria"));
  const [people, setPeople] = useState<Persona[]>(personas);
  const [launchGoal, setLaunchGoal] = useState<string | null>(null);
  const [launchSuccess, setLaunchSuccess] = useState<string | null>(null);
  const [device, setDevice] = useState<Device>("mobile");
  const [panel, setPanel] = useState<"none" | "mood" | "personas" | "run" | "resident">("none");
  const [decisions, setDecisions] = useState<Record<string, "accepted" | "aside">>(
    () => loadJson(DECISIONS_KEY, {}),
  );
  const [comfort, setComfort] = useState(() => loadJson(COMFORT_KEY, false));
  const [feelingCaption, setFeelingCaption] = useState<string | null>(() =>
    loadJson<string | null>(CAPTION_KEY, null),
  );
  const [ledgerCount, setLedgerCount] = useState(() => readLedger().length);

  const record = useCallback((kind: string, detail: Record<string, unknown>) => {
    appendLedger(kind, detail);
    setLedgerCount((n) => n + 1);
  }, []);

  /* The work speaks. A job is real work in flight; instant work files
     and finishes in the same breath, long work reports its true steps.
     Done and failed cards leave the stack on their own after a beat. */
  const [jobs, setJobs] = useState<Job[]>([]);
  const jobSeq = useRef(0);
  const beginJob = useCallback((title: string, detail?: string) => {
    jobSeq.current += 1;
    const id = `job-${jobSeq.current}`;
    setJobs((prev) => [
      ...prev,
      { id, title, detail: detail ?? null, progress: null, state: "working", startedAt: Date.now() },
    ]);
    return id;
  }, []);
  const updateJob = useCallback(
    (id: string, patch: { progress?: number; detail?: string }) => {
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
    },
    [],
  );
  const endJob = useCallback((id: string, line?: string, failed?: boolean) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === id
          ? {
              ...j,
              state: failed ? "failed" : "done",
              detail: line ?? j.detail,
              progress: failed ? j.progress : 1,
            }
          : j,
      ),
    );
    window.setTimeout(() => {
      setJobs((prev) => prev.filter((j) => j.id !== id));
    }, 5200);
  }, []);

  /* The Studio: which scripted edits the user chose to apply. */
  const [appliedEdits, setAppliedEdits] = useState<string[]>(() =>
    loadJson<string[]>(STUDIO_KEY, []),
  );
  const applyEdit = useCallback(
    (id: string) => {
      setAppliedEdits((prev) => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        saveJson(STUDIO_KEY, next);
        return next;
      });
      record("studio.accepted", { edit: id });
      const job = beginJob("Applying the edit", "The diff you approved is landing.");
      endJob(job, "Edit applied. The render carries it.");
    },
    [record, beginJob, endJob],
  );

  /* The ask bar: words in, a room and a recorded judgment out. */
  const [pendingAsk, setPendingAsk] = useState<string | null>(null);
  const clearPendingAsk = useCallback(() => setPendingAsk(null), []);
  const ask = useCallback(
    (text: string) => {
      const routed = routeAsk(text);
      if (routed.studioAsk) setPendingAsk(routed.studioAsk);
      record("ask.asked", { text, view: routed.view });
      setPanel("none");
      setView(routed.view as View);
    },
    [record],
  );

  /* The Audience: archetypes the resident is built to win, persisted. */
  const [audience, setAudience] = useState<AudienceState>(() =>
    loadJson(AUDIENCE_KEY, defaultAudience()),
  );
  useEffect(() => {
    saveJson(AUDIENCE_KEY, audience);
  }, [audience]);

  const describeAudience = useCallback(
    (text: string) => {
      const made = composeArchetype(text);
      setAudience((prev) => {
        if (prev.archetypes.some((a) => a.id === made.id)) return { ...prev, primaryId: made.id };
        const next = [...prev.archetypes, { ...made, activeTraits: [], adoptedWhy: null }];
        return { archetypes: next.slice(-3), primaryId: made.id };
      });
      record("audience.described", { text, archetype: made.id });
    },
    [record],
  );

  const adoptArchetype = useCallback(
    (a: Archetype, rationale: string) => {
      setAudience((prev) => {
        if (prev.archetypes.some((x) => x.id === a.id)) return { ...prev, primaryId: a.id };
        const next = [...prev.archetypes, { ...a, activeTraits: [], adoptedWhy: rationale }];
        return { archetypes: next.slice(-3), primaryId: a.id };
      });
      record("audience.adopted", { archetype: a.id, rationale });
      const job = beginJob(`Adopting ${a.name}`, "The render and the benchmarks follow.");
      endJob(job, `${a.name} adopted. The resident renders for them now.`);
    },
    [record, beginJob, endJob],
  );

  const setPrimaryArchetype = useCallback(
    (id: string) => {
      setAudience((prev) =>
        prev.archetypes.some((a) => a.id === id) ? { ...prev, primaryId: id } : prev,
      );
      record("audience.primary", { archetype: id });
    },
    [record],
  );

  const removeArchetype = useCallback((id: string) => {
    setAudience((prev) => {
      const rest = prev.archetypes.filter((a) => a.id !== id);
      /* an audience never empties; the last archetype stays */
      if (rest.length === 0) return prev;
      return {
        archetypes: rest,
        primaryId: prev.primaryId === id ? rest[0].id : prev.primaryId,
      };
    });
  }, []);

  const setArchetypeRange = useCallback((id: string, range: [number, number]) => {
    setAudience((prev) => ({
      ...prev,
      archetypes: prev.archetypes.map((a) => (a.id === id ? { ...a, ageRange: range } : a)),
    }));
  }, []);

  const toggleArchetypeTrait = useCallback((id: string, trait: string) => {
    setAudience((prev) => ({
      ...prev,
      archetypes: prev.archetypes.map((a) =>
        a.id === id
          ? {
              ...a,
              activeTraits: a.activeTraits.includes(trait)
                ? a.activeTraits.filter((t) => t !== trait)
                : [...a.activeTraits, trait],
            }
          : a,
      ),
    }));
  }, []);

  useEffect(() => {
    saveJson(COMFORT_KEY, comfort);
  }, [comfort]);
  useEffect(() => {
    saveJson(CAPTION_KEY, feelingCaption);
  }, [feelingCaption]);
  /* An accepted healable finding is healed, even if the tab closed
     before the heal animation landed. Decisions are the truth. */
  const [healed, setHealed] = useState<Set<string>>(() => {
    const stored = new Set(loadJson<string[]>(HEALED_KEY, []));
    const accepted = loadJson<Record<string, string>>(DECISIONS_KEY, {});
    issues.forEach((i) => {
      if (i.healable && accepted[i.id] === "accepted") stored.add(i.id);
    });
    return stored;
  });
  const [healing, setHealing] = useState(false);
  const [transformAccepted, setTransformAccepted] = useState(() =>
    loadJson<boolean>(ACCEPT_KEY, false),
  );
  const [extraInbox, setExtraInbox] = useState<InboxEntry[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [droppedName, setDroppedName] = useState<string | null>(null);
  const [pendingDrop, setPendingDrop] = useState<string | null>(null);
  const [seenTips, setSeenTips] = useState<Set<string>>(
    () => new Set(loadJson<string[]>(SEEN_KEY, [])),
  );
  const [justLaunched, setJustLaunched] = useState(false);
  const [returned, setReturned] = useState(() => {
    const last = loadJson<number>(LAST_SEEN_KEY, 0);
    return last > 0 && Date.now() - last > RETURN_AFTER_MS;
  });

  /* Keep the away-clock honest: stamp on load, on leave, and every
     minute while open, so even a killed browser leaves a true clock. */
  useEffect(() => {
    const stamp = () => saveJson(LAST_SEEN_KEY, Date.now());
    stamp();
    const interval = window.setInterval(stamp, 60_000);
    window.addEventListener("beforeunload", stamp);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("beforeunload", stamp);
    };
  }, []);

  useEffect(() => {
    saveJson(SEEN_KEY, [...seenTips]);
  }, [seenTips]);

  useEffect(() => {
    saveJson(HEALED_KEY, [...healed]);
  }, [healed]);
  useEffect(() => {
    saveJson(ACCEPT_KEY, transformAccepted);
  }, [transformAccepted]);
  useEffect(() => {
    saveJson(STYLE_KEY, styleId);
  }, [styleId]);
  useEffect(() => {
    saveJson(MOOD_KEY, mood);
  }, [mood]);
  useEffect(() => {
    saveJson(PERSONA_KEY, personaId);
  }, [personaId]);

  const switchTab = useCallback((id: string) => {
    setActiveTab(id);
    setPanel("none");
    setView((v) => {
      const tab = id === DEMO_TAB.id;
      if (tab) return v === "place" || v === "assets" ? "home" : v;
      return "place";
    });
  }, []);

  const addTab = useCallback(() => {
    setTabs((prev) => {
      if (prev.length >= 10) return prev;
      const n = prev.filter((t) => !t.isDemo).length + 1;
      const tab: Tab = { id: `tab-${Date.now()}`, name: `Untitled ${n}`, isDemo: false };
      setActiveTab(tab.id);
      setView("place");
      setUploadPhase("idle");
      setPanel("none");
      return [...prev, tab];
    });
  }, []);

  const closeTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        const next = prev.filter((t) => t.id !== id);
        if (next.length === 0) return prev;
        if (id === activeTab) {
          setActiveTab(next[next.length - 1].id);
          setView(next[next.length - 1].isDemo ? "home" : "place");
        }
        return next;
      });
    },
    [activeTab],
  );

  /** The example path: the seeded resident, clearly labeled as such. */
  const beginUpload = useCallback((dropped?: string) => {
    setProject(null);
    setProgress([]);
    setDroppedName(dropped ?? null);
    setView("assets");
    setUploadPhase("reading");
  }, []);

  const finishReading = useCallback(() => {
    setUploadPhase((p) => (p === "reading" ? "understood" : p));
  }, []);

  /**
   * The real path: parse what was actually dropped, measure it, and let
   * the theater speak only true lines. Nothing here is invented.
   */
  const [realSlug, setRealSlug] = useState<string | null>(null);

  /**
   * The residency, real: the dropped app's readable files persist on
   * this machine and the address serves them. GitHub keeps the code;
   * the address keeps the life.
   */
  const giveAddress = useCallback(() => {
    if (!project) return;
    let slug = project.inventory.name
      .toLowerCase()
      .replace(/\.zip$/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30);
    /* the address route wants a letter first; digits get a quiet prefix */
    if (!slug || slug === "skyrecall" || !/^[a-z]/.test(slug)) slug = `app-${slug || "one"}`;
    const registry = loadJson<Record<string, unknown>>("osyle.residents", {});
    const textFiles = [...project.files.values()]
      .filter((f) => f.text !== null)
      .slice(0, 40)
      .map((f) => ({ path: f.path, text: (f.text as string).slice(0, 200_000) }));
    /* carried media persists too, capped so storage survives it */
    let mediaBudget = 3_000_000;
    const media = [...project.files.values()]
      .filter((f) => f.dataUri)
      .slice(0, 8)
      .filter((f) => {
        mediaBudget -= (f.dataUri as string).length;
        return mediaBudget > 0;
      })
      .map((f) => ({ path: f.path, dataUri: f.dataUri as string, bytes: f.bytes }));
    registry[slug] = {
      name: project.inventory.name,
      vitality: project.vitality,
      styleId,
      savedAt: new Date().toISOString(),
      files: textFiles,
      media,
    };
    saveJson("osyle.residents", registry);
    setRealSlug(slug);
    record("address.given", { slug, files: textFiles.length });
    const job = beginJob("Giving it the address", `${textFiles.length} files moving in.`);
    endJob(job, `It lives at ${slug}.osyle.app now.`);
    setPanel("none");
    setView("address");
  }, [project, styleId, record, beginJob, endJob]);

  const analyzeFiles = useCallback(async (dropped: DroppedFile[]) => {
    const first = dropped[0] instanceof File ? dropped[0] : dropped[0]?.file;
    const firstPath =
      dropped[0] instanceof File
        ? (dropped[0] as File & { webkitRelativePath?: string }).webkitRelativePath ||
          dropped[0].name
        : (dropped[0]?.path ?? "project");
    const name = firstPath.includes("/")
      ? firstPath.split("/")[0]
      : dropped.length === 1
        ? (first?.name ?? "project").replace(/\.zip$/i, "")
        : `${dropped.length} files`;
    setDroppedName(null);
    /* the room knows a real app is being read from the first instant,
       so the example never speaks over someone's own drop */
    setPendingDrop(name);
    setProgress([{ phase: "Upload", text: `Reading ${name}` }]);
    setView("assets");
    setUploadPhase("reading");
    try {
      const files = await filesFromInput(dropped);
      if (files.size === 0) {
        setProgress([
          { phase: "Reassemble", text: "Nothing readable arrived. Try a zip, a folder, or web files." },
        ]);
        window.setTimeout(() => setUploadPhase("idle"), 1600);
        setPendingDrop(null);
        setView("place");
        return;
      }
      const truncated = files.size >= 40;
      const analyzed = await analyzeProject(
        name,
        files,
        (line) => setProgress((prev) => [...prev, line]),
        truncated,
      );
      setProject(analyzed);
      setPendingDrop(null);
      setRealDecisions({});
      record("project.analyzed", {
        name,
        files: files.size,
        vitality: analyzed.vitality,
        findings: analyzed.lenses.reduce((s, l) => s + l.findings.length, 0),
      });
      window.setTimeout(() => setUploadPhase("understood"), 900);
    } catch {
      setProgress((prev) => [
        ...prev,
        { phase: "Errors", text: "Reading failed partway. What was read still counts; drop again to retry." },
      ]);
      setPendingDrop(null);
      window.setTimeout(() => setUploadPhase("understood"), 900);
    }
  }, [record]);

  /**
   * The repo door: a person names their repository, Osyle reads the
   * app from it and the whole examination follows. Public repos now;
   * the token flow for private ones arrives with Real Mode.
   */
  const analyzeRepo = useCallback(
    async (text: string): Promise<string | null> => {
      const ref = parseRepoUrl(text);
      if (!ref) return "Name it like github.com/you/your-app.";
      /* stay on the place until the repo actually answers, so an
         honest refusal lands where the person still is */
      const job = beginJob(`Reaching ${ref.owner}/${ref.repo}`, "Asking GitHub for the app.");
      try {
        const file = await fetchRepoZip(ref);
        record("repo.connected", { repo: `${ref.owner}/${ref.repo}` });
        updateJob(job, { detail: "The app answered. Examining it." });
        await analyzeFiles([file]);
        endJob(job, "Examined. The report is yours.");
        return null;
      } catch (err) {
        const line = err instanceof Error ? err.message : "The connection failed. Try again.";
        endJob(job, line, true);
        return line;
      }
    },
    [analyzeFiles, record, beginJob, updateJob, endJob],
  );

  /**
   * Real Mode's wire: when the switch is on, the stack is probed once
   * and spoken to honestly. Unreachable degrades to one quiet line;
   * everything local keeps working, which is the entire doctrine.
   */
  const stackOn = (() => {
    try {
      return localStorage.getItem("osyle.realMode") === "true";
    } catch {
      return false;
    }
  })();
  const stackBase = (() => {
    try {
      return localStorage.getItem("osyle.apiBase") ?? "http://localhost:8787";
    } catch {
      return "http://localhost:8787";
    }
  })();
  const [stackUp, setStackUp] = useState<boolean | null>(null);
  const [stackClaim, setStackClaim] = useState<{
    address: string;
    note: string;
    uploaded: number;
  } | null>(null);
  useEffect(() => {
    if (!stackOn) return;
    const ctl = new AbortController();
    const t = window.setTimeout(() => ctl.abort(), 2500);
    fetch(`${stackBase}/health`, { signal: ctl.signal })
      .then((r) => setStackUp(r.ok))
      .catch(() => setStackUp(false))
      .finally(() => window.clearTimeout(t));
    return () => {
      ctl.abort();
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const claimOnStack = useCallback(
    async (email: string): Promise<string | null> => {
      if (!project || !realSlug) return "Give it the address first.";
      if (!email.includes("@")) return "A real email address claims it.";
      const job = beginJob("Claiming on the stack", "Registering the resident.");
      try {
        const res = await fetch(`${stackBase}/partner/import`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, name: project.inventory.name, slug: realSlug }),
        });
        if (!res.ok) {
          endJob(job, `The stack answered ${res.status}.`, true);
          return `The stack answered ${res.status}. The local address still serves.`;
        }
        const body = (await res.json()) as {
          resident: { slug: string; address: string };
          claimLink: string;
          note: string;
        };
        /* the claim link is the session; verify it now and the Vault
           opens, so the files move in versioned from day one */
        let uploaded = 0;
        try {
          const verify = await fetch(`${stackBase}${body.claimLink}`, {
            credentials: "include",
          });
          if (verify.ok) {
            const textFiles = [...project.files.values()]
              .filter((f) => f.text !== null)
              .slice(0, 40);
            for (const [i, f] of textFiles.entries()) {
              updateJob(job, {
                detail: `Moving the files into the Vault, ${i + 1} of ${textFiles.length}.`,
                progress: (i + 1) / textFiles.length,
              });
              const put = await fetch(
                `${stackBase}/residents/${body.resident.slug}/files/${f.path}`,
                {
                  method: "PUT",
                  credentials: "include",
                  headers: { "content-type": "application/octet-stream" },
                  body: new TextEncoder().encode(f.text as string),
                },
              );
              if (put.ok) uploaded += 1;
            }
          }
        } catch {
          /* the registration stands; the Vault fills on the next claim */
        }
        setStackClaim({ address: body.resident.address, note: body.note, uploaded });
        record("stack.claimed", { slug: realSlug, address: body.resident.address, uploaded });
        endJob(job, `Claimed. ${uploaded} files versioned at ${body.resident.address}.`);
        return null;
      } catch {
        endJob(job, "The stack did not answer.", true);
        return "The stack did not answer. The local address still serves.";
      }
    },
    [project, realSlug, stackBase, record, beginJob, updateJob, endJob],
  );

  /* The registry entry follows every change so the address serves the
     new bytes; same shape giveAddress writes. */
  const writeRegistry = useCallback(
    (analyzed: AnalyzedProject, slug: string) => {
      const registry = loadJson<Record<string, unknown>>("osyle.residents", {});
      const textFiles = [...analyzed.files.values()]
        .filter((f) => f.text !== null)
        .slice(0, 40)
        .map((f) => ({ path: f.path, text: (f.text as string).slice(0, 200_000) }));
      let mediaBudget = 3_000_000;
      const media = [...analyzed.files.values()]
        .filter((f) => f.dataUri)
        .slice(0, 8)
        .filter((f) => {
          mediaBudget -= (f.dataUri as string).length;
          return mediaBudget > 0;
        })
        .map((f) => ({ path: f.path, dataUri: f.dataUri as string, bytes: f.bytes }));
      registry[slug] = {
        name: analyzed.inventory.name,
        vitality: analyzed.vitality,
        styleId,
        savedAt: new Date().toISOString(),
        files: textFiles,
        media,
      };
      saveJson("osyle.residents", registry);
    },
    [styleId],
  );

  /* The file room: new material merges into the app and the whole
     examination runs again, quietly; a replacement keeps its path so
     nothing that points at the file breaks. */
  const mergeFiles = useCallback(
    async (dropped: DroppedFile[], replacePath?: string) => {
      if (!project || dropped.length === 0) return;
      const job = beginJob(
        replacePath ? `Replacing ${replacePath}` : "Adding files",
        "Reading the new material.",
      );
      try {
        const incoming = await filesFromInput(dropped);
        if (incoming.size === 0) {
          endJob(job, "Nothing readable arrived.", true);
          return;
        }
        const merged = new Map(project.files);
        if (replacePath && incoming.size === 1) {
          const nf = [...incoming.values()][0];
          merged.set(replacePath, { ...nf, path: replacePath });
        } else {
          for (const [p, f] of incoming) merged.set(p, f);
        }
        updateJob(job, { detail: "Re-examining the app." });
        const analyzed = await analyzeProject(
          project.inventory.name,
          merged,
          () => undefined,
          merged.size >= 40,
          true,
        );
        setProject(analyzed);
        record(replacePath ? "file.replaced" : "files.added", {
          path: replacePath ?? null,
          count: incoming.size,
        });
        if (realSlug) writeRegistry(analyzed, realSlug);
        endJob(
          job,
          replacePath
            ? `${replacePath} replaced. The render follows.`
            : `${incoming.size} file${incoming.size === 1 ? "" : "s"} added and examined.`,
        );
      } catch {
        endJob(job, "The files could not be read.", true);
      }
    },
    [project, realSlug, beginJob, updateJob, endJob, record, writeRegistry],
  );

  const saveFileText = useCallback(
    async (path: string, text: string) => {
      if (!project) return;
      const old = project.files.get(path);
      if (!old || old.text === null) return;
      const job = beginJob(`Saving ${path}`, "The edit is landing.");
      try {
        const merged = new Map(project.files);
        merged.set(path, { ...old, text, bytes: new TextEncoder().encode(text).length });
        const analyzed = await analyzeProject(
          project.inventory.name,
          merged,
          () => undefined,
          merged.size >= 40,
          true,
        );
        setProject(analyzed);
        record("file.edited", { path });
        if (realSlug) writeRegistry(analyzed, realSlug);
        endJob(job, `${path} saved and re-examined.`);
      } catch {
        endJob(job, "The edit could not be saved.", true);
      }
    },
    [project, realSlug, beginJob, endJob, record, writeRegistry],
  );

  /* The name is editable where it is worn. The project, the tab, and
     the residency registry all follow; the address keeps its slug so
     shared links never break. */
  const renameResident = useCallback(
    (name: string) => {
      const clean = name.trim().slice(0, 40);
      if (!clean) return;
      setTabs((prev) => prev.map((t, i) => (i === 0 ? { ...t, name: clean } : t)));
      if (project) {
        setProject((prev) =>
          prev ? { ...prev, inventory: { ...prev.inventory, name: clean } } : prev,
        );
        if (realSlug) {
          const registry = loadJson<Record<string, { name?: string }>>("osyle.residents", {});
          if (registry[realSlug]) {
            registry[realSlug] = { ...registry[realSlug], name: clean };
            saveJson("osyle.residents", registry);
          }
        }
      }
      record("name.changed", { name: clean });
    },
    [project, realSlug, record],
  );

  const decideReal = useCallback((findingId: string, decision: "accepted" | "aside") => {
    setRealDecisions((prev) => ({ ...prev, [findingId]: decision }));
    appendLedger("finding.decided.real", { findingId, decision });
    setLedgerCount((n) => n + 1);
  }, []);

  const markTipSeen = useCallback((tip: string) => {
    setSeenTips((prev) => new Set([...prev, tip]));
  }, []);

  const goHomeFromLaunch = useCallback(() => {
    saveJson(LAUNCHED_KEY, true);
    setJustLaunched(true);
    setPanel("none");
    setView("home");
  }, []);

  const clearLaunchArrival = useCallback(() => setJustLaunched(false), []);

  const dismissReturn = useCallback(() => setReturned(false), []);

  useEffect(() => {
    saveJson(DECISIONS_KEY, decisions);
  }, [decisions]);

  /**
   * One decision per finding. Accepting a healable finding heals it on
   * the spot, and the pulse rises; accepting the key queues the Fix
   * Prompt; setting aside is quiet and reversible.
   */
  const decide = useCallback(
    (issueId: string, decision: "accepted" | "aside") => {
      const issue = issues.find((i) => i.id === issueId);
      setDecisions((prev) => ({ ...prev, [issueId]: decision }));
      record("finding.decided", {
        issueId,
        decision,
        valueMonthly: issue?.valueMonthly ?? 0,
        lens: issue?.lens,
      });
      if (decision === "accepted" && issue?.healable) {
        window.setTimeout(() => {
          setHealed((prev) => new Set([...prev, issueId]));
        }, 400);
      }
    },
    [record],
  );

  const restoreAside = useCallback(() => {
    setDecisions((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([, d]) => d !== "aside")),
    );
  }, []);

  const setStyleId = useCallback(
    (styleTarget: string) => {
      if (!styleCatalog.some((s) => s.id === styleTarget)) return;
      if (styleId !== styleTarget) {
        record("style.chosen", { chosen: styleTarget, leftBehind: styleId });
      }
      setStyleIdRaw(styleTarget);
    },
    [record, styleId],
  );

  const setMood = useCallback((m: Partial<Mood>) => {
    setMoodRaw((prev) => ({ ...prev, ...m }));
  }, []);

  const applyFeeling = useCallback(
    (text: string) => {
      const mapped = mapFeeling(text);
      setStyleIdRaw(mapped.styleId);
      setMoodRaw(mapped.mood);
      setComfort(mapped.comfort);
      setFeelingCaption(mapped.caption);
      record("feeling.applied", { text, ...mapped });
    },
    [record],
  );

  const setPersonaId = useCallback(
    (id: string) => {
      if (people.some((p) => p.id === id)) setPersonaIdRaw(id);
    },
    [people],
  );

  const updatePersona = useCallback(
    (id: string, patch: Partial<Omit<Persona, "id">>) => {
      setPeople((cur) => cur.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      record("persona.edited", { id });
    },
    [record],
  );

  /* new people wear drawn gradients like the seeded three; the reach
     says it is unmeasured until someone measures it */
  const addPersona = useCallback((): string => {
    const id = `p-own-${Math.random().toString(36).slice(2, 8)}`;
    const cloth = [
      "linear-gradient(150deg, #a5c4b1 0%, #5f8a6f 55%, #2c4a38 100%)",
      "linear-gradient(150deg, #e0a5a5 0%, #b05f5f 55%, #5e2626 100%)",
      "linear-gradient(150deg, #a5b8e0 0%, #5f74b0 55%, #263a5e 100%)",
    ];
    setPeople((cur) => [
      ...cur,
      {
        id,
        name: "New persona",
        age: 34,
        role: "Their role",
        line: "One line on when they reach for the app",
        portrait: cloth[cur.length % cloth.length],
        reach: "reach not measured yet",
      },
    ]);
    setPersonaIdRaw(id);
    record("persona.added", { id });
    return id;
  }, [record]);

  const togglePanel = useCallback((p: "mood" | "personas" | "run" | "resident") => {
    setPanel((prev) => (prev === p ? "none" : p));
  }, []);

  const healableOpen = useMemo(
    () =>
      issues
        .filter((i) => i.healable && !healed.has(i.id))
        .filter((i) => i.history[i.history.length - 1] !== "healed")
        .map((i) => i.id),
    [healed],
  );

  const lensScore = useCallback(
    (key: string) => {
      const lens = lenses.find((l) => l.key === key);
      if (!lens) return 0;
      const gain = issues
        .filter((i) => i.lens === key && healed.has(i.id))
        .reduce((sum, i) => sum + i.healGain, 0);
      return Math.min(100, lens.score + gain);
    },
    [healed],
  );

  const vitality = useMemo(() => {
    if (project) return project.vitality;
    const weighted = lenses.reduce(
      (sum, l) => sum + l.weight * lensScore(l.key),
      0,
    );
    return Math.round(weighted);
  }, [lensScore, project]);

  const heal = useCallback(() => {
    if (healing || healableOpen.length === 0) return;
    setHealing(true);
    const queue = [...healableOpen];
    record("heal.tapped", { issues: queue });
    const job = beginJob(
      queue.length === 1 ? "Healing one issue" : `Healing ${numberWord(queue.length)} issues`,
      "Each repair lands with its receipt.",
    );
    updateJob(job, { progress: 0 });
    queue.forEach((issueId, idx) => {
      window.setTimeout(() => {
        setHealed((prev) => new Set([...prev, issueId]));
        updateJob(job, { progress: (idx + 1) / queue.length });
        if (idx === queue.length - 1) {
          endJob(job, queue.length === 1 ? "One issue healed." : `${numberWord(queue.length)} issues healed.`);
          setHealing(false);
          const now = new Date();
          const when = now.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
          });
          setExtraInbox((prev) => [
            {
              id: `in-heal-${Date.now()}`,
              when: `${when}, ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`,
              text: `${queue.length === 1 ? "One issue" : `${numberWord(queue.length)} issues`} healed. Your app got better today.`,
              read: false,
            },
            ...prev,
          ]);
        }
      }, 500 * (idx + 1));
    });
  }, [healing, healableOpen, record, beginJob, updateJob, endJob]);

  /* Notes the founder composed by hand in the Owner console arrive
     here like any other director note: unread, signed, first. */
  const composedNotes = useMemo(
    () => loadJson<InboxEntry[]>("osyle.owner.composed", []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const inbox = useMemo(
    () =>
      [...composedNotes, ...extraInbox, ...inboxSeed].map((e) =>
        readIds.has(e.id) ? { ...e, read: true } : e,
      ),
    [composedNotes, extraInbox, readIds],
  );

  const markRead = useCallback((entryId: string) => {
    setReadIds((prev) => new Set([...prev, entryId]));
  }, []);

  const acceptTransform = useCallback(() => {
    setTransformAccepted(true);
    record("transform.accepted", { styleId, mood });
  }, [record, styleId, mood]);

  const resetDemo = useCallback(() => {
    dropKeys([
      HEALED_KEY,
      ACCEPT_KEY,
      STYLE_KEY,
      MOOD_KEY,
      PERSONA_KEY,
      SEEN_KEY,
      LAST_SEEN_KEY,
      LAUNCHED_KEY,
      DECISIONS_KEY,
      LEDGER_KEY,
      COMFORT_KEY,
      CAPTION_KEY,
      AUDIENCE_KEY,
      STUDIO_KEY,
      "osyle.residents",
      "osyle.owner.composed",
      "osyle.owner.prompts",
    ]);
    setAudience(defaultAudience());
    setAppliedEdits([]);
    setDecisions({});
    setComfort(false);
    setFeelingCaption(null);
    setLedgerCount(0);
    setProject(null);
    setProgress([]);
    setRealDecisions({});
    setRealSlug(null);
    setDroppedName(null);
    setSeenTips(new Set());
    setJustLaunched(false);
    setReturned(false);
    setHealed(new Set());
    setTransformAccepted(false);
    setExtraInbox([]);
    setReadIds(new Set());
    setTabs([DEMO_TAB]);
    setActiveTab(DEMO_TAB.id);
    setStyleIdRaw("st-paper");
    setMoodRaw({ energy: 30, style: 25, tone: 65 });
    setPersonaIdRaw("p-maria");
    setPeople(personas);
    setLaunchGoal(null);
    setLaunchSuccess(null);
    setDevice("mobile");
    setPanel("none");
    setUploadPhase("idle");
    setView("landing");
  }, []);

  const store: Store = {
    view,
    go: (v) => {
      setPanel("none");
      setView(v);
    },
    tabs,
    activeTab,
    switchTab,
    addTab,
    closeTab,
    uploadPhase,
    beginUpload,
    finishReading,
    droppedName,
    pendingDrop,
    project,
    analyzeFiles,
    analyzeRepo,
    stack: { on: stackOn, up: stackUp, base: stackBase },
    stackClaim,
    claimOnStack,
    realSlug,
    giveAddress,
    progress,
    realDecisions,
    decideReal,
    seenTips,
    markTipSeen,
    justLaunched,
    clearLaunchArrival,
    goHomeFromLaunch,
    returned,
    dismissReturn,
    styleId,
    setStyleId,
    mood,
    setMood,
    applyFeeling,
    comfort,
    feelingCaption,
    ledgerCount,
    personaId,
    setPersonaId,
    people,
    updatePersona,
    addPersona,
    launchGoal,
    setLaunchGoal,
    launchSuccess,
    setLaunchSuccess,
    appliedEdits,
    applyEdit,
    ask,
    pendingAsk,
    clearPendingAsk,
    audience,
    describeAudience,
    adoptArchetype,
    setPrimaryArchetype,
    removeArchetype,
    setArchetypeRange,
    toggleArchetypeTrait,
    device,
    setDevice,
    panel,
    togglePanel,
    decisions,
    decide,
    restoreAside,
    healed,
    healing,
    heal,
    healableOpen,
    vitality,
    lensScore,
    inbox,
    markRead,
    transformAccepted,
    acceptTransform,
    resetDemo,
    renameResident,
    mergeFiles,
    saveFileText,
    jobs,
    beginJob,
    updateJob,
    endJob,
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

function numberWord(n: number): string {
  const words = ["Zero", "One", "Two", "Three", "Four", "Five", "Six"];
  return words[n] ?? String(n);
}
