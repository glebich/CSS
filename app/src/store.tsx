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
  beginUpload: () => void;
  /* style, mood, persona, device */
  styleId: string;
  setStyleId: (id: string) => void;
  mood: Mood;
  setMood: (m: Partial<Mood>) => void;
  personaId: string;
  setPersonaId: (id: string) => void;
  device: Device;
  setDevice: (d: Device) => void;
  /* floating panels */
  panel: "none" | "mood" | "personas" | "run";
  togglePanel: (p: "mood" | "personas" | "run") => void;
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
  const [view, setView] = useState<View>("landing");
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
  const [healed, setHealed] = useState<Set<string>>(
    () => new Set(loadJson<string[]>(HEALED_KEY, [])),
  );
  const [healing, setHealing] = useState(false);
  const [transformAccepted, setTransformAccepted] = useState(() =>
    loadJson<boolean>(ACCEPT_KEY, false),
  );
  const [extraInbox, setExtraInbox] = useState<InboxEntry[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

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

  /** The gradient sweeps while the system reads, then everything is understood. */
  const beginUpload = useCallback(() => {
    setView("assets");
    setUploadPhase("reading");
    window.setTimeout(() => setUploadPhase("understood"), 3400);
  }, []);

  const setStyleId = useCallback((id: string) => {
    if (styleCatalog.some((s) => s.id === id)) setStyleIdRaw(id);
  }, []);

  const setMood = useCallback((m: Partial<Mood>) => {
    setMoodRaw((prev) => ({ ...prev, ...m }));
  }, []);

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
  }, [healing, healableOpen]);

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

  const acceptTransform = useCallback(() => setTransformAccepted(true), []);

  const resetDemo = useCallback(() => {
    [HEALED_KEY, ACCEPT_KEY, STYLE_KEY, MOOD_KEY, PERSONA_KEY].forEach((k) =>
      localStorage.removeItem(k),
    );
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
    styleId,
    setStyleId,
    mood,
    setMood,
    personaId,
    setPersonaId,
    device,
    setDevice,
    panel,
    togglePanel,
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
