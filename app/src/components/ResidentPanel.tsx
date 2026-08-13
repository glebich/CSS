import { useEffect, useState } from "react";
import { readLedger, useStore } from "../store";
import { materials, resident } from "../data/seed";

/**
 * The resident panel: the app's whole life in one drawer that opens
 * over any working screen. Files, the last update, the connection,
 * settings, and privacy, the first-tier features a repository host
 * has, said in human sentences. Everything shown is read from real
 * state; whatever needs a later stage names it.
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
    /* the panel still works for the session */
  }
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="section-label" style={{ marginTop: 26, marginBottom: 8 }}>
      {children}
    </div>
  );
}


/** One file, workable in place: replace it, or edit it as text. */
function FileRowView({
  f,
  editingPath,
  setEditingPath,
  draftText,
  setDraftText,
  onReplace,
  onSave,
}: {
  f: { path: string; bytes: number; text: string | null; dataUri?: string };
  editingPath: string | null;
  setEditingPath: (p: string | null) => void;
  draftText: string;
  setDraftText: (t: string) => void;
  onReplace: (file: File, path: string) => void;
  onSave: (path: string, text: string) => void;
}) {
  return (
    <div className="file-row">
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {f.dataUri && /\.(png|jpe?g|gif|webp|svg)$/i.test(f.path) && (
          <img className="file-thumb" src={f.dataUri} alt="" />
        )}
        <span
          className="mono"
          style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12.5 }}
        >
          {f.path}
        </span>
        <span style={{ color: "var(--gray-small)", flex: "none", fontSize: 12 }}>
          {(f.bytes / 1024).toFixed(1)} KB
        </span>
      </div>
      <div className="file-acts">
        <label className="file-act">
          Replace
          <input
            type="file"
            style={{ display: "none" }}
            onChange={(e) => {
              const picked = e.target.files?.[0];
              e.target.value = "";
              if (picked) onReplace(picked, f.path);
            }}
          />
        </label>
        {f.text !== null && (
          <button
            className="file-act"
            onClick={() => {
              if (editingPath === f.path) {
                setEditingPath(null);
              } else {
                setEditingPath(f.path);
                setDraftText(f.text ?? "");
              }
            }}
          >
            {editingPath === f.path ? "Close" : "Edit"}
          </button>
        )}
      </div>
      {editingPath === f.path && (
        <div style={{ marginTop: 6 }}>
          <textarea
            className="file-editor mono"
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            spellCheck={false}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button
              className="pill pill-sm pill-dark"
              onClick={() => {
                onSave(f.path, draftText);
                setEditingPath(null);
              }}
            >
              Save the file
            </button>
            <button className="pill pill-sm" onClick={() => setEditingPath(null)}>
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ResidentPanel() {
  const { project, realSlug, stack, go, togglePanel, mergeFiles, saveFileText, changeAddress } =
    useStore();
  const slug = project ? realSlug : resident.slug;
  const name = project ? project.inventory.name : resident.name;

  const ledger = readLedger();
  const lastEntry = ledger[ledger.length - 1] ?? null;
  const lastUpdated = lastEntry
    ? `${lastEntry.at.slice(0, 10)}, ${lastEntry.at.slice(11, 16)}`
    : "no decisions recorded yet";

  const repoEntry = [...ledger].reverse().find((e) => e.kind === "repo.connected");
  const repo = repoEntry ? String(repoEntry.detail.repo ?? "") : null;
  const [prCount, setPrCount] = useState<number | "quiet" | null>(null);
  useEffect(() => {
    if (!repo) return;
    fetch(`https://api.github.com/repos/${repo}/pulls?state=open&per_page=30`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((rows: unknown[]) => setPrCount(rows.length))
      .catch(() => setPrCount("quiet"));
  }, [repo]);

  const [visibility, setVisibility] = useState<Record<string, string>>(() =>
    loadJson("osyle.visibility", {}),
  );
  const [domains, setDomains] = useState<Record<string, string>>(() =>
    loadJson("osyle.domains", {}),
  );
  const [domainDraft, setDomainDraft] = useState(slug ? (domains[slug] ?? "") : "");
  const [domainLine, setDomainLine] = useState<string | null>(null);

  /* moving house: the new address, and what stopped it if anything */
  const [moving, setMoving] = useState(false);
  const [moveDraft, setMoveDraft] = useState("");
  const [moveWord, setMoveWord] = useState<string | null>(null);

  /* the resident's key, kept from the claim, handed over on request */
  const sdkKey = slug ? (loadJson<Record<string, string>>("osyle.keys", {})[slug] ?? null) : null;
  const [keyCopied, setKeyCopied] = useState(false);

  /* the stack's round: the caretaker's last look, read when the panel
     opens, refreshed on demand */
  interface RoundPulse {
    files: number;
    bytes: number;
    indexOk: boolean;
    brokenRefs: number;
    lookedAt: string;
  }
  const [round, setRound] = useState<RoundPulse | null>(null);
  const [roundNote, setRoundNote] = useState<string | null>(null);
  useEffect(() => {
    if (!project || !stack.on || !stack.up || !realSlug) return;
    fetch(`${stack.base}/residents/${realSlug}/pulse`, { credentials: "include" })
      .then((r) => (r.ok ? (r.json() as Promise<{ pulse: RoundPulse | null }>) : null))
      .then((b) => {
        if (b?.pulse) setRound(b.pulse);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, realSlug, stack.on, stack.up, stack.base]);
  const askForALook = () => {
    if (!realSlug) {
      setRoundNote("Claim the app on the stack and the round begins.");
      return;
    }
    fetch(`${stack.base}/residents/${realSlug}/pulse`, {
      method: "POST",
      credentials: "include",
    })
      .then(async (res) => {
        if (res.ok) {
          const body = (await res.json()) as { pulse: RoundPulse };
          setRound(body.pulse);
          setRoundNote(null);
        } else if (res.status === 404 || res.status === 401) {
          setRoundNote("Claim the app on the stack and the round begins.");
        } else {
          setRoundNote(`The stack answered ${res.status}.`);
        }
      })
      .catch(() => setRoundNote("The stack is not answering."));
  };
  const unlisted = slug ? visibility[slug] === "unlisted" : false;

  const files = project ? [...project.files.values()] : null;
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  /* the files live in folders, every folder open until closed */
  const [closedFolders, setClosedFolders] = useState<Set<string>>(new Set());
  const folders = files
    ? [...files.reduce((m, f) => {
        const seg = f.path.includes("/") ? f.path.split("/")[0] : "loose files";
        m.set(seg, [...(m.get(seg) ?? []), f]);
        return m;
      }, new Map<string, typeof files>())]
    : null;

  return (
    <>
      <div className="resident-backdrop" onClick={() => togglePanel("resident")} />
      <aside className="resident-panel glass-panel" aria-label="Your app">
        <button
          className="panel-x"
          onClick={() => togglePanel("resident")}
          aria-label="Close the panel"
        >
          <svg width="10" height="10" viewBox="0 0 8 8" fill="none" aria-hidden>
            <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>

        <div className="panel-title" style={{ marginBottom: 4 }}>{name}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {slug ? (
            <span className="chip">{slug}.osyle.app</span>
          ) : (
            <span className="chip">no address yet</span>
          )}
          {!project && <span className="chip">Example</span>}
        </div>
        <p style={{ fontSize: 12.5, color: "var(--gray-small)", marginTop: 10 }}>
          Last updated {lastUpdated}
          {project && `. Examined ${project.analyzedAt.slice(0, 10)}.`}
        </p>

        <SectionLabel>The files it holds</SectionLabel>
        {files ? (
          /* flex, not grid: a grid row can refuse to grow around an
             opened editor, and the cards then overlap */
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* the file room: every file visible and workable in place */}
            <label className="pill pill-sm file-add">
              Add files
              <input
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={(e) => {
                  const list = [...(e.target.files ?? [])];
                  e.target.value = "";
                  if (list.length > 0) void mergeFiles(list);
                }}
              />
            </label>
            {(folders ?? []).map(([folder, inside]) => (
              <div key={folder} className="folder-group">
                <button
                  className="folder-head"
                  onClick={() =>
                    setClosedFolders((prev) => {
                      const next = new Set(prev);
                      if (next.has(folder)) next.delete(folder);
                      else next.add(folder);
                      return next;
                    })
                  }
                  aria-label={`${folder}, ${inside.length} file${inside.length === 1 ? "" : "s"}`}
                >
                  <span className="folder-shape" aria-hidden />
                  <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>{folder}</span>
                  <span style={{ color: "var(--gray-small)", fontSize: 11.5 }}>
                    {inside.length} file{inside.length === 1 ? "" : "s"}
                  </span>
                </button>
                {!closedFolders.has(folder) &&
                  inside.map((f) => (
                    <FileRowView
                      key={f.path}
                      f={f}
                      editingPath={editingPath}
                      setEditingPath={setEditingPath}
                      draftText={draftText}
                      setDraftText={setDraftText}
                      onReplace={(file, path) => void mergeFiles([file], path)}
                      onSave={(path, text) => void saveFileText(path, text)}
                    />
                  ))}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 4 }}>
            {materials.map((m) => (
              <div key={m.id} style={{ display: "flex", gap: 10, fontSize: 12.5, color: "var(--ink-body)" }}>
                <span style={{ flex: 1 }}>{m.name}</span>
                <span style={{ color: "var(--gray-small)" }}>{m.size}</span>
              </div>
            ))}
            <span style={{ fontSize: 12, color: "var(--gray-small)", marginTop: 4 }}>
              The example is read only. Drop your own app to work its files.
            </span>
          </div>
        )}
        {slug && (
          <button
            className="pill pill-sm"
            style={{ marginTop: 10 }}
            onClick={() => {
              navigator.clipboard?.writeText(`https://${slug}.osyle.app`).catch(() => undefined);
            }}
          >
            Copy the share link
          </button>
        )}

        <SectionLabel>The connection</SectionLabel>
        {repo ? (
          <div style={{ fontSize: 13, color: "var(--ink-body)", display: "grid", gap: 4 }}>
            <a href={`https://github.com/${repo}`} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
              {repo}
            </a>
            <span style={{ color: "var(--gray-small)", fontSize: 12.5 }}>
              {prCount === null
                ? "Counting open pull requests"
                : prCount === "quiet"
                  ? "GitHub is not answering right now"
                  : `${prCount} open pull request${prCount === 1 ? "" : "s"}`}
            </span>
            <span style={{ color: "var(--gray-small)", fontSize: 12.5 }}>
              Checks and reviews arrive with the GitHub app stage.
            </span>
          </div>
        ) : (
          <p style={{ fontSize: 12.5, color: "var(--gray-small)" }}>
            No repository connected. The repo door is on the Place step.
          </p>
        )}

        {project && slug && (
          <>
            <SectionLabel>Its address</SectionLabel>
            <div style={{ display: "grid", gap: 10 }}>
              {moving ? (
                <>
                  <div className="address-field" style={{ marginTop: 0, padding: "9px 14px" }}>
                    <input
                      className="address-input"
                      style={{ fontSize: 15 }}
                      value={moveDraft}
                      autoFocus
                      aria-label="The new address"
                      spellCheck={false}
                      onChange={(e) =>
                        setMoveDraft(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
                      }
                    />
                    <span className="address-roof" style={{ fontSize: 15 }}>
                      .osyle.app
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--gray-small)" }}>
                    {slug}.osyle.app keeps pointing here after the move, so
                    anything you have already shared still arrives.
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="pill pill-sm"
                      onClick={() => {
                        void changeAddress(moveDraft).then((trouble) => {
                          setMoveWord(trouble);
                          if (!trouble) setMoving(false);
                        });
                      }}
                    >
                      Move it there
                    </button>
                    <button className="pill pill-sm" onClick={() => setMoving(false)}>
                      Keep this one
                    </button>
                  </div>
                </>
              ) : (
                <button
                  className="pill pill-sm"
                  style={{ justifySelf: "start" }}
                  onClick={() => {
                    setMoveDraft(slug);
                    setMoveWord(null);
                    setMoving(true);
                  }}
                >
                  Change the address
                </button>
              )}
              {moveWord && (
                <p className="fade-in" style={{ fontSize: 12, color: "var(--bad)" }}>
                  {moveWord}
                </p>
              )}
            </div>
          </>
        )}

        <SectionLabel>Settings</SectionLabel>
        {slug ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {(["public", "unlisted"] as const).map((v) => (
                <button
                  key={v}
                  className="pill pill-sm"
                  style={
                    (v === "unlisted") === unlisted
                      ? { boxShadow: "inset 0 0 0 1.5px var(--ink-strong)" }
                      : undefined
                  }
                  onClick={() => {
                    const next = { ...visibility, [slug]: v };
                    setVisibility(next);
                    saveJson("osyle.visibility", next);
                  }}
                >
                  {v === "public" ? "Seen on Discover" : "Unlisted"}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div className="ask-pill" style={{ minWidth: 0, flex: "1 1 150px", height: 44 }}>
                <input
                  placeholder="yourdomain.com"
                  value={domainDraft}
                  onChange={(e) => {
                    setDomainDraft(e.target.value);
                    setDomainLine(null);
                  }}
                />
              </div>
              <button
                className="pill pill-sm"
                disabled={!domainDraft.trim()}
                onClick={() => {
                  const value = domainDraft.trim().toLowerCase();
                  const next = { ...domains, [slug]: value };
                  setDomains(next);
                  saveJson("osyle.domains", next);
                  /* claimed on the stack: the domain becomes real there,
                     and the stack starts answering by that name */
                  if (project && stack.on && stack.up && realSlug === slug) {
                    fetch(`${stack.base}/residents/${slug}/domain`, {
                      method: "PUT",
                      headers: { "content-type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ domain: value }),
                    })
                      .then(async (res) => {
                        const body = (await res.json().catch(() => null)) as {
                          error?: string;
                        } | null;
                        setDomainLine(
                          res.ok
                            ? `The stack holds it. Point ${value} at the stack and it serves this app.`
                            : res.status === 404 || res.status === 401
                              ? "Saved here. Claim the app on the stack and the domain turns real there."
                              : (body?.error ?? "The stack refused the domain."),
                        );
                      })
                      .catch(() =>
                        setDomainLine(
                          "The stack is not answering; the preference stays on this machine.",
                        ),
                      );
                  } else {
                    setDomainLine(
                      "Saved. Point your DNS at hosted Osyle when it ships; the osyle.app address answers either way.",
                    );
                  }
                }}
              >
                Save the domain
              </button>
            </div>
            {domainLine && (
              <p className="fade-in" style={{ fontSize: 12, color: "var(--gray-small)" }}>
                {domainLine}
              </p>
            )}
            {sdkKey && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span className="mono" style={{ fontSize: 11.5, color: "var(--gray-small)" }}>
                  SDK key {sdkKey.slice(0, 6)}&hellip;
                </span>
                <button
                  className="pill pill-sm"
                  onClick={() => {
                    void navigator.clipboard?.writeText(sdkKey).then(() => {
                      setKeyCopied(true);
                      window.setTimeout(() => setKeyCopied(false), 2000);
                    });
                  }}
                >
                  {keyCopied ? "Copied" : "Copy the SDK key"}
                </button>
                <span style={{ fontSize: 11.5, color: "var(--gray-small)", flexBasis: "100%" }}>
                  The rdb doors open only for it; the SDK&apos;s http transport
                  carries it as x-osyle-key.
                </span>
              </div>
            )}
          </div>
        ) : (
          <p style={{ fontSize: 12.5, color: "var(--gray-small)" }}>
            Visibility and the domain open once the app has its address. The
            door is at the end of the report.
          </p>
        )}

        {project && stack.on && stack.up && (
          <>
            <SectionLabel>The stack&apos;s round</SectionLabel>
            <div style={{ display: "grid", gap: 8 }}>
              <p style={{ fontSize: 12.5, color: "var(--gray-small)" }}>
                {round
                  ? `Looked ${round.lookedAt.slice(0, 10)}, ${round.lookedAt.slice(11, 16)}. ` +
                    `${round.files} file${round.files === 1 ? "" : "s"}, ` +
                    `${Math.max(1, Math.round(round.bytes / 1024))} KB. ` +
                    `The front door ${round.indexOk ? "answers" : "is silent"}. ` +
                    `${round.brokenRefs} broken reference${round.brokenRefs === 1 ? "" : "s"}.`
                  : "No look recorded yet. The round walks on the stack's clock, or ask now."}
              </p>
              {roundNote && (
                <p className="fade-in" style={{ fontSize: 12, color: "var(--gray-small)" }}>
                  {roundNote}
                </p>
              )}
              <button className="pill pill-sm" style={{ justifySelf: "start" }} onClick={askForALook}>
                Ask for a fresh look
              </button>
            </div>
          </>
        )}

        <SectionLabel>Security and privacy</SectionLabel>
        <div style={{ display: "grid", gap: 5, fontSize: 12.5, color: "var(--gray-small)" }}>
          <span>Everything on this page lives on this machine.</span>
          <span>Model keys never leave it; they power live edits with Real Mode.</span>
          <span>{ledger.length} decisions in your ledger, exportable from the Address.</span>
          {stack.on && (
            <span>
              {stack.up
                ? `The stack at ${stack.base} is answering.`
                : `The stack at ${stack.base} is not answering; everything local keeps working.`}
            </span>
          )}
          <span>Accounts and sessions arrive with Real Mode.</span>
        </div>
        {project && realSlug && (
          <button
            className="pill pill-sm"
            style={{ marginTop: 12 }}
            onClick={() => {
              togglePanel("resident");
              go("address");
            }}
          >
            Export everything, on the Address
          </button>
        )}
      </aside>
    </>
  );
}
