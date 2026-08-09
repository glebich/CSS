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
  resident,
  type InboxEntry,
  inboxSeed,
} from "./data/seed";

export type View =
  | "landing"
  | "drop"
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

const HEALED_KEY = "osyle.demo.healed";
const ACCEPT_KEY = "osyle.demo.transformAccepted";

export const sdk = createClient(resident.slug);

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Issues still open in the current examination. */
export function currentState(issueId: string, healed: Set<string>) {
  const issue = issues.find((i) => i.id === issueId);
  if (!issue) return "new";
  if (healed.has(issueId)) return "healed";
  return issue.history[issue.history.length - 1];
}

interface Store {
  view: View;
  go: (v: View) => void;
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

export function StoreProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>("landing");
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

  /** One tap. Issues heal in sequence, 500ms apart, and the pulse rises. */
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
    localStorage.removeItem(HEALED_KEY);
    localStorage.removeItem(ACCEPT_KEY);
    setHealed(new Set());
    setTransformAccepted(false);
    setExtraInbox([]);
    setReadIds(new Set());
    setView("landing");
  }, []);

  const store: Store = {
    view,
    go: setView,
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
