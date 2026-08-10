import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "./sdk/osyle";
import {
  issues,
  lenses,
  mapFeeling,
  personas,
  resident,
  styleCatalog,
  type InboxEntry,
  inboxSeed,
} from "./data/seed";

export type View =
  | "landing"
  | "place"
  | "assets"
  | "style"
  | "launch"
  | "home"
  | "exam"
  | "findings"
  | "transform"
  | "reveal"
  | "issues"
  | "address"
  | "monitor"
  | "inbox"
  | "sdk"
  | "promote";

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
  localStorage.setItem(LEDGER_KEY, JSON.stringify(entries));
}

export function readLedger(): LedgerEntry[] {
  return loadJson<LedgerEntry[]>(LEDGER_KEY, []);
}

/** Away long enough that the resident has a story to tell. */
const RETURN_AFTER_MS = 4 * 60 * 60 * 1000;

export const sdk = createClient(resident.slug);

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function currentState(issueId: string, healed: Set<string>) {
  const issue = issues.find((i) => i.id === issueId);
  if (!issue) return "new";
  if (healed.has(issueId)) return "healed";
  return issue.history[issue.history.length - 1];
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
  device: Device;
  setDevice: (d: Device) => void;
  /* floating panels */
  panel: "none" | "mood" | "personas" | "run";
  togglePanel: (p: "mood" | "personas" | "run") => void;
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
  const [styleId, setStyleIdRaw] = useState(() => loadJson(STYLE_KEY, "st-paper"));
  const [mood, setMoodRaw] = useState<Mood>(() =>
    loadJson<Mood>(MOOD_KEY, { energy: 30, style: 25, tone: 65 }),
  );
  const [personaId, setPersonaIdRaw] = useState(() => loadJson(PERSONA_KEY, "p-maria"));
  const [device, setDevice] = useState<Device>("mobile");
  const [panel, setPanel] = useState<"none" | "mood" | "personas" | "run">("none");
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

  useEffect(() => {
    localStorage.setItem(COMFORT_KEY, JSON.stringify(comfort));
  }, [comfort]);
  useEffect(() => {
    localStorage.setItem(CAPTION_KEY, JSON.stringify(feelingCaption));
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
    const stamp = () => localStorage.setItem(LAST_SEEN_KEY, JSON.stringify(Date.now()));
    stamp();
    const interval = window.setInterval(stamp, 60_000);
    window.addEventListener("beforeunload", stamp);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("beforeunload", stamp);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seenTips]));
  }, [seenTips]);

  useEffect(() => {
    localStorage.setItem(HEALED_KEY, JSON.stringify([...healed]));
  }, [healed]);
  useEffect(() => {
    localStorage.setItem(ACCEPT_KEY, JSON.stringify(transformAccepted));
  }, [transformAccepted]);
  useEffect(() => {
    localStorage.setItem(STYLE_KEY, JSON.stringify(styleId));
  }, [styleId]);
  useEffect(() => {
    localStorage.setItem(MOOD_KEY, JSON.stringify(mood));
  }, [mood]);
  useEffect(() => {
    localStorage.setItem(PERSONA_KEY, JSON.stringify(personaId));
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

  /** The theater reads aloud while the gradient sweeps; it decides when done. */
  const beginUpload = useCallback((dropped?: string) => {
    setDroppedName(dropped ?? null);
    setView("assets");
    setUploadPhase("reading");
  }, []);

  const finishReading = useCallback(() => {
    setUploadPhase((p) => (p === "reading" ? "understood" : p));
  }, []);

  const markTipSeen = useCallback((tip: string) => {
    setSeenTips((prev) => new Set([...prev, tip]));
  }, []);

  const goHomeFromLaunch = useCallback(() => {
    localStorage.setItem(LAUNCHED_KEY, JSON.stringify(true));
    setJustLaunched(true);
    setPanel("none");
    setView("home");
  }, []);

  const clearLaunchArrival = useCallback(() => setJustLaunched(false), []);

  const dismissReturn = useCallback(() => setReturned(false), []);

  useEffect(() => {
    localStorage.setItem(DECISIONS_KEY, JSON.stringify(decisions));
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

  const setPersonaId = useCallback((id: string) => {
    if (personas.some((p) => p.id === id)) setPersonaIdRaw(id);
  }, []);

  const togglePanel = useCallback((p: "mood" | "personas" | "run") => {
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
    const weighted = lenses.reduce(
      (sum, l) => sum + l.weight * lensScore(l.key),
      0,
    );
    return Math.round(weighted);
  }, [lensScore]);

  const heal = useCallback(() => {
    if (healing || healableOpen.length === 0) return;
    setHealing(true);
    const queue = [...healableOpen];
    record("heal.tapped", { issues: queue });
    queue.forEach((issueId, idx) => {
      window.setTimeout(() => {
        setHealed((prev) => new Set([...prev, issueId]));
        if (idx === queue.length - 1) {
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
  }, [healing, healableOpen, record]);

  const inbox = useMemo(
    () =>
      [...extraInbox, ...inboxSeed].map((e) =>
        readIds.has(e.id) ? { ...e, read: true } : e,
      ),
    [extraInbox, readIds],
  );

  const markRead = useCallback((entryId: string) => {
    setReadIds((prev) => new Set([...prev, entryId]));
  }, []);

  const acceptTransform = useCallback(() => {
    setTransformAccepted(true);
    record("transform.accepted", { styleId, mood });
  }, [record, styleId, mood]);

  const resetDemo = useCallback(() => {
    [
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
    ].forEach((k) => localStorage.removeItem(k));
    setDecisions({});
    setComfort(false);
    setFeelingCaption(null);
    setLedgerCount(0);
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
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

function numberWord(n: number): string {
  const words = ["Zero", "One", "Two", "Three", "Four", "Five", "Six"];
  return words[n] ?? String(n);
}
