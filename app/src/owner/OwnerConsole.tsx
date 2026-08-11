import { useEffect, useMemo, useState } from "react";
import { artDirector, growthLoops, promptsSeed, resident } from "../data/seed";
import type { InboxEntry } from "../data/seed";
import { readLedger } from "../store";
import { readGrowth } from "../engine/reportcard";

/**
 * The Owner console at #/owner: the operator's room, built for a
 * non-engineer. Everything shown is read from the same storage the
 * product writes, so the god-view is the truth, not a mock. What
 * cannot be measured yet says example or names its stage.
 */

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* the console still renders */
  }
}

type Tab = "residents" | "compose" | "prompts" | "growth" | "health";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "residents", label: "Residents" },
  { id: "compose", label: "Compose a note" },
  { id: "prompts", label: "Prompt studio" },
  { id: "growth", label: "Growth" },
  { id: "health", label: "Health" },
];

interface StoredResidentRow {
  name: string;
  vitality: number;
  savedAt: string;
  files: Array<{ path: string }>;
}

function ResidentsDesk() {
  const registry = loadJson<Record<string, StoredResidentRow>>("osyle.residents", {});
  const styleId = loadJson<string>("osyle.demo.style", "st-paper");
  const applied = loadJson<string[]>("osyle.demo.studioApplied", []);
  const audience = loadJson<{ archetypes: Array<{ id: string; name: string }>; primaryId: string }>(
    "osyle.demo.audience",
    { archetypes: [], primaryId: "" },
  );
  const primary = audience.archetypes.find((a) => a.id === audience.primaryId);
  const ledger = readLedger();

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="card card-pad">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="pulse-dot" />
          <span style={{ fontWeight: 550, fontSize: 16 }}>{resident.name}</span>
          <span className="chip">Demo resident</span>
          <span className="topbar-spacer" />
          <a className="pill pill-sm" href="#/r/skyrecall" style={{ textDecoration: "none" }}>
            Visit
          </a>
        </div>
        <div style={{ display: "flex", gap: 26, marginTop: 12, fontSize: 13, color: "var(--gray-meta)", flexWrap: "wrap" }}>
          <span>Wearing {styleId.replace("st-", "")}</span>
          <span>{applied.length} studio edit{applied.length === 1 ? "" : "s"} applied</span>
          <span>Audience: {primary ? primary.name : "the professional refresher"}</span>
          <span>{ledger.length} ledger decision{ledger.length === 1 ? "" : "s"}</span>
        </div>
      </div>
      {Object.entries(registry).map(([slug, row]) => (
        <div key={slug} className="card card-pad">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="pulse-dot" style={{ animation: "none" }} />
            <span style={{ fontWeight: 550, fontSize: 16 }}>{row.name}</span>
            <span className="chip">{slug}.osyle.app</span>
            <span className="topbar-spacer" />
            <a className="pill pill-sm" href={`#/r/${slug}`} style={{ textDecoration: "none" }}>
              Visit
            </a>
          </div>
          <div style={{ display: "flex", gap: 26, marginTop: 12, fontSize: 13, color: "var(--gray-meta)", flexWrap: "wrap" }}>
            <span>Vitality {row.vitality} at move-in</span>
            <span>{row.files.length} files held</span>
            <span>Moved in {row.savedAt.slice(0, 10)}</span>
          </div>
        </div>
      ))}
      {Object.keys(registry).length === 0 && (
        <p style={{ fontSize: 13, color: "var(--gray-small)" }}>
          No dropped apps have taken an address on this machine yet.
        </p>
      )}
    </div>
  );
}

function Composer() {
  const [kind, setKind] = useState<"weekly" | "intervention" | "rounds">("weekly");
  const [text, setText] = useState("");
  const [evidence, setEvidence] = useState("");
  const [quote, setQuote] = useState("");
  const [left, setLeft] = useState(false);

  function leaveNote() {
    const composed = loadJson<InboxEntry[]>("osyle.owner.composed", []);
    const now = new Date();
    const entry: InboxEntry = {
      id: `in-owner-${now.getTime()}`,
      when: `${now.toLocaleDateString("en-US", { month: "long", day: "numeric" })}, ${now
        .toTimeString()
        .slice(0, 5)}`,
      text,
      read: false,
      director: {
        kind,
        evidence,
        ...(quote.trim() ? { quote: quote.trim() } : {}),
      },
    };
    saveJson("osyle.owner.composed", [entry, ...composed]);
    setLeft(true);
  }

  if (left) {
    return (
      <div className="card card-pad">
        <p style={{ fontWeight: 510 }}>The note is in the resident&apos;s inbox, unread, signed.</p>
        <p style={{ fontSize: 13, color: "var(--gray-meta)", marginTop: 6 }}>
          It reads exactly like the director&apos;s own: this is the concierge
          era working as designed.
        </p>
        <button
          className="pill pill-sm"
          style={{ marginTop: 12 }}
          onClick={() => {
            setLeft(false);
            setText("");
            setEvidence("");
            setQuote("");
          }}
        >
          Compose another
        </button>
      </div>
    );
  }

  return (
    <div className="card card-pad" style={{ maxWidth: 640 }}>
      <p style={{ fontSize: 13, color: "var(--gray-meta)" }}>
        Written by hand, delivered in {artDirector.name}&apos;s voice. Calm,
        specific, kind, brief. Every claim needs its evidence.
      </p>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        {(["weekly", "intervention", "rounds"] as const).map((k) => (
          <button
            key={k}
            className="pill pill-sm"
            style={kind === k ? { boxShadow: "inset 0 0 0 1.5px var(--ink-strong)" } : undefined}
            onClick={() => setKind(k)}
          >
            {k}
          </button>
        ))}
      </div>
      <textarea
        placeholder="The note itself, as one or two human sentences"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        style={{ width: "100%", marginTop: 12, padding: "10px 13px", borderRadius: 10, border: "1px solid var(--hairline)", fontSize: 13.5, fontFamily: "inherit", resize: "vertical" }}
      />
      <input
        placeholder="Evidence, cited plainly"
        value={evidence}
        onChange={(e) => setEvidence(e.target.value)}
        style={{ width: "100%", marginTop: 8, padding: "10px 13px", borderRadius: 10, border: "1px solid var(--hairline)", fontSize: 13 }}
      />
      <input
        placeholder="A quotable line, optional"
        value={quote}
        onChange={(e) => setQuote(e.target.value)}
        style={{ width: "100%", marginTop: 8, padding: "10px 13px", borderRadius: 10, border: "1px solid var(--hairline)", fontSize: 13 }}
      />
      <button
        className="pill pill-dark"
        style={{ marginTop: 14 }}
        disabled={!text.trim() || !evidence.trim()}
        onClick={leaveNote}
      >
        Leave the note
      </button>
    </div>
  );
}

type PromptState = Record<string, { versions: string[]; current: number }>;

function PromptStudio() {
  const [prompts, setPrompts] = useState<PromptState>(() => {
    const stored = loadJson<PromptState>("osyle.owner.prompts", {});
    const base: PromptState = {};
    for (const p of promptsSeed) {
      base[p.id] = stored[p.id] ?? { versions: [p.text], current: 0 };
    }
    return base;
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  function persist(next: PromptState) {
    setPrompts(next);
    saveJson("osyle.owner.prompts", next);
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <p style={{ fontSize: 13, color: "var(--gray-meta)", maxWidth: 620 }}>
        Every prompt the system will run, versioned from day one. Editing
        writes a new version; rollback restores the one before. Test runs
        against SkyRecall arrive with Real Mode and a key.
      </p>
      {promptsSeed.map((p) => {
        const state = prompts[p.id];
        const isEditing = editing === p.id;
        return (
          <div key={p.id} className="card card-pad">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontWeight: 550 }}>{p.name}</span>
              <span className="chip">v{state.current + 1}</span>
              <span className="topbar-spacer" />
              {state.current > 0 && (
                <button
                  className="pill pill-sm"
                  onClick={() =>
                    persist({ ...prompts, [p.id]: { ...state, current: state.current - 1 } })
                  }
                >
                  Roll back to v{state.current}
                </button>
              )}
              <button
                className="pill pill-sm"
                onClick={() => {
                  setEditing(isEditing ? null : p.id);
                  setDraft(state.versions[state.current]);
                }}
              >
                {isEditing ? "Close" : "Edit"}
              </button>
            </div>
            {isEditing ? (
              <div>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={4}
                  style={{ width: "100%", marginTop: 10, padding: "10px 13px", borderRadius: 10, border: "1px solid var(--hairline)", fontSize: 13, fontFamily: "inherit", resize: "vertical" }}
                />
                <button
                  className="pill pill-sm"
                  style={{ marginTop: 8 }}
                  disabled={draft.trim() === state.versions[state.current]}
                  onClick={() => {
                    const versions = [...state.versions.slice(0, state.current + 1), draft.trim()];
                    persist({ ...prompts, [p.id]: { versions, current: versions.length - 1 } });
                    setEditing(null);
                  }}
                >
                  Save as v{state.current + 2}
                </button>
              </div>
            ) : (
              <p className="mono" style={{ fontSize: 12.5, color: "var(--gray-meta)", marginTop: 10, lineHeight: 1.6 }}>
                {state.versions[state.current]}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Growth() {
  const registry = loadJson<Record<string, unknown>>("osyle.residents", {});
  const composed = loadJson<InboxEntry[]>("osyle.owner.composed", []);
  const waitlist = loadJson<Array<Record<string, unknown>>>(
    "osyle.sdk.skyrecall.rows.waitlist",
    [],
  );
  const liveMetric = (name: string): string => {
    if (name === "The address is the ad")
      return `${1 + Object.keys(registry).length} resident${Object.keys(registry).length === 0 ? "" : "s"} carrying the mark`;
    if (name === "The shareable Report Card")
      return `${readGrowth("reportcards")} card${readGrowth("reportcards") === 1 ? "" : "s"} downloaded`;
    if (name === "Referral in kind")
      return `${readGrowth("invites")} invite${readGrowth("invites") === 1 ? "" : "s"} copied`;
    return `${3 + composed.length} notes delivered`;
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="card card-pad">
        <div style={{ fontWeight: 550 }}>The six loops</div>
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {growthLoops.map((loop) => (
            <div key={loop.name} style={{ display: "flex", gap: 12, fontSize: 13.5 }}>
              <span style={{ minWidth: 220, fontWeight: 510 }}>{loop.name}</span>
              <span style={{ color: "var(--gray-meta)" }}>
                {loop.real ? liveMetric(loop.name) : loop.metric}
              </span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "var(--gray-small)", marginTop: 12 }}>
          Rates marked example begin measuring when the share surfaces ship
          with their stage. Nothing here is invented.
        </p>
      </div>
      <div className="card card-pad">
        <div style={{ fontWeight: 550 }}>Promotion desk</div>
        {waitlist.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--gray-meta)", marginTop: 8 }}>
            The waitlist is empty on this machine. Every join lands here with
            the audience it would deliver against.
          </p>
        ) : (
          <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
            {waitlist.map((row, i) => (
              <div key={i} style={{ fontSize: 13.5, color: "var(--gray-meta)" }}>
                {String(row.email ?? "someone")} joined the promotion waitlist
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Health() {
  const stats = useMemo(() => {
    let bytes = 0;
    let keys = 0;
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const k = localStorage.key(i);
        if (k?.startsWith("osyle.")) {
          keys += 1;
          bytes += (localStorage.getItem(k) ?? "").length;
        }
      }
    } catch {
      /* health still renders */
    }
    return { bytes, keys, ledger: readLedger().length };
  }, []);

  return (
    <div className="card card-pad" style={{ maxWidth: 560 }}>
      <div style={{ fontWeight: 550 }}>This machine</div>
      <div style={{ display: "grid", gap: 6, marginTop: 12, fontSize: 13.5, color: "var(--gray-meta)" }}>
        <span>{stats.keys} storage keys held, {(stats.bytes / 1024).toFixed(1)} KB</span>
        <span>{stats.ledger} decisions in the ledger</span>
        <span>All state local and exportable through the Address</span>
      </div>
      <StackHealth />
    </div>
  );
}

/** The stack's own /health, read live when Real Mode names a base. */
function StackHealth() {
  const on = (() => {
    try {
      return localStorage.getItem("osyle.realMode") === "true";
    } catch {
      return false;
    }
  })();
  const base = (() => {
    try {
      return localStorage.getItem("osyle.apiBase") ?? "http://localhost:8787";
    } catch {
      return "http://localhost:8787";
    }
  })();
  const [health, setHealth] = useState<
    { ok: boolean; db: boolean; blobs: boolean; uptimeSeconds: number } | "down" | null
  >(null);
  useEffect(() => {
    if (!on) return;
    fetch(`${base}/health`)
      .then((r) => r.json())
      .then((j) => setHealth(j as { ok: boolean; db: boolean; blobs: boolean; uptimeSeconds: number }))
      .catch(() => setHealth("down"));
  }, [on, base]);

  if (!on) {
    return (
      <p style={{ fontSize: 12, color: "var(--gray-small)", marginTop: 12 }}>
        The stack&apos;s health appears here when Real Mode is on and a base
        answers. This console reads what exists.
      </p>
    );
  }
  if (health === null) {
    return (
      <p style={{ fontSize: 12, color: "var(--gray-small)", marginTop: 12 }}>Reaching {base}</p>
    );
  }
  if (health === "down") {
    return (
      <p style={{ fontSize: 12, color: "var(--gray-small)", marginTop: 12 }}>
        The stack at {base} is not answering. Everything local keeps working.
      </p>
    );
  }
  return (
    <div style={{ marginTop: 12, fontSize: 13, color: "var(--gray-meta)", display: "grid", gap: 4 }}>
      <span style={{ fontWeight: 550, color: "var(--ink)" }}>The stack answers</span>
      <span>Database {health.db ? "healthy" : "down"}, blobs {health.blobs ? "healthy" : "down"}</span>
      <span>Up {health.uptimeSeconds} seconds at {base}</span>
    </div>
  );
}

export function OwnerConsole() {
  const [tab, setTab] = useState<Tab>("residents");

  return (
    <main className="canvas" style={{ minHeight: "100vh", overflowY: "auto" }}>
      <div className="canvas-inner" style={{ maxWidth: 980, paddingBottom: 80 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, paddingTop: 26 }}>
          <h1 style={{ fontSize: 26, fontWeight: 550, letterSpacing: "-0.02em" }}>Owner console</h1>
          <span className="chip">Operator surface</span>
          <span className="topbar-spacer" />
          <a className="pill pill-sm" href="#/" style={{ textDecoration: "none" }}>
            Back to Osyle
          </a>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              className="pill pill-sm"
              style={tab === t.id ? { boxShadow: "inset 0 0 0 1.5px var(--ink-strong)" } : undefined}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 22 }}>
          {tab === "residents" && <ResidentsDesk />}
          {tab === "compose" && <Composer />}
          {tab === "prompts" && <PromptStudio />}
          {tab === "growth" && <Growth />}
          {tab === "health" && <Health />}
        </div>
      </div>
    </main>
  );
}
