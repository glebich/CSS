import { useEffect, useState } from "react";
import { readLedger, useStore, type LedgerEntry } from "../store";
import { Page, Sparkle } from "../components/chrome";
import { artDirector } from "../data/seed";

interface Told {
  at: string;
  text: string;
  note?: string;
}

function when(iso: string): string {
  return `${iso.slice(0, 10)}, ${iso.slice(11, 16)}`;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : String(v ?? "");
}

/** One ledger entry, said as a sentence. Unknown kinds stay unsaid
    rather than being dressed up in language nobody wrote. */
function tell(e: LedgerEntry): Told | null {
  const d = e.detail ?? {};
  switch (e.kind) {
    case "project.analyzed":
      return {
        at: e.at,
        text: `Examined. Vitality ${str(d.vitality)}, from your own files.`,
      };
    case "address.given":
      return { at: e.at, text: `The address was given: ${str(d.slug)}.osyle.app.` };
    case "stack.claimed":
      return {
        at: e.at,
        text: `Moved onto the stack at ${str(d.address)}.`,
        note: `${str(d.uploaded)} files versioned into the Vault.`,
      };
    case "repo.connected":
      return { at: e.at, text: `Connected the repository ${str(d.repo)}.` };
    case "finding.decided":
      return {
        at: e.at,
        text: `A finding was ${str(d.decision) === "aside" ? "set aside" : "accepted"}.`,
      };
    case "style.chosen":
      return { at: e.at, text: `The style was chosen: ${str(d.name) || str(d.styleId)}.` };
    case "name.changed":
      return { at: e.at, text: `Renamed to ${str(d.name)}.` };
    case "file.edited":
      return { at: e.at, text: `A file was edited: ${str(d.path)}.` };
    case "persona.added":
      return { at: e.at, text: `A person was added to the audience: ${str(d.name)}.` };
    case "persona.edited":
      return { at: e.at, text: `A person in the audience was rewritten.` };
    case "transform.accepted":
      return { at: e.at, text: "The dressed future was accepted." };
    case "heal.tapped":
      return { at: e.at, text: "Healing was applied to what could heal itself." };
    case "feeling.applied":
      return { at: e.at, text: `A feeling was applied: ${str(d.text) || str(d.feeling)}.` };
    default:
      return null;
  }
}

interface Pulse {
  files: number;
  bytes: number;
  indexOk: boolean;
  brokenRefs: number;
  lookedAt: string;
}

/** What a round found, said only when it found something worth a line. */
function tellPulse(p: Pulse, newest: boolean): Told | null {
  if (!p.indexOk) {
    return {
      at: p.lookedAt,
      text: "The caretaker knocked and found no front door.",
      note: "Nothing at the root of the address answers a visitor.",
    };
  }
  if (p.brokenRefs > 0) {
    return {
      at: p.lookedAt,
      text: `The caretaker found ${p.brokenRefs} reference${p.brokenRefs === 1 ? "" : "s"} that do not land.`,
      note: "Local files the pages ask for are not in the Vault.",
    };
  }
  return newest
    ? {
        at: p.lookedAt,
        text: "The caretaker looked. The door answered and every reference landed.",
      }
    : null;
}

/**
 * The Inbox for a real app: its own record, nothing borrowed. Every
 * line here is something that happened to this app, drawn from the
 * ledger this machine keeps and the rounds the stack walked.
 */
function RealInbox() {
  const { project, realSlug, stack, go } = useStore();
  const [pulses, setPulses] = useState<Pulse[]>([]);

  useEffect(() => {
    if (!stack.on || stack.up !== true || !realSlug) return;
    fetch(`${stack.base}/residents/${realSlug}/pulse`, { credentials: "include" })
      .then((r) => (r.ok ? (r.json() as Promise<{ history: Pulse[] }>) : null))
      .then((b) => setPulses(b?.history ?? []))
      .catch(() => undefined);
  }, [stack.on, stack.up, stack.base, realSlug]);

  const told: Told[] = [
    ...readLedger().flatMap((e) => tell(e) ?? []),
    ...pulses.flatMap((p, i) => tellPulse(p, i === 0) ?? []),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <Page>
      <h1 className="statement statement-page">
        One quiet <span className="quiet">stream.</span>
      </h1>
      <p style={{ color: "var(--gray-meta)", marginTop: 6, maxWidth: 640 }}>
        Everything that has happened to {project?.inventory.name ?? "this app"},
        in the order it happened. Kept on this machine, and on the stack once
        the app moved there. Silence when there is nothing worth saying.
      </p>

      {told.length === 0 ? (
        <div className="card card-pad" style={{ marginTop: 30 }}>
          <p style={{ color: "var(--gray-meta)" }}>
            Nothing has happened to this app yet. The record starts with its
            first examination.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: "6px 24px", marginTop: 30 }}>
          {told.slice(0, 50).map((t) => (
            <div key={`${t.at}-${t.text}`} className="inbox-item">
              <span className="inbox-dot read" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, color: "var(--ink)" }}>{t.text}</div>
                {t.note && (
                  <div style={{ fontSize: 12, color: "var(--gray-small)", marginTop: 4 }}>
                    {t.note}
                  </div>
                )}
                <div style={{ fontSize: 12, color: "var(--gray-meta)", marginTop: 3 }}>
                  {when(t.at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 34 }}>
        <button className="pill pill-dark" onClick={() => go("home")}>
          Back to the work
          <Sparkle size={13} />
        </button>
        <button className="pill" onClick={() => go("monitor")}>
          What the caretaker watches
        </button>
      </div>
    </Page>
  );
}

/** The Inbox: the one quiet stream. Everything arrives as human sentences,
    and the Art Director's composed notes arrive here too, signed. */
export function Inbox() {
  const { inbox, markRead, go, project } = useStore();
  const unread = inbox.filter((e) => !e.read);

  /* a real app reads its own record; the seeded stream below is the
     example's story and stays with the example */
  if (project) return <RealInbox />;

  return (
    <Page>
      <h1 className="statement statement-page">
        One quiet <span className="quiet">stream.</span>
      </h1>
      <p style={{ color: "var(--gray-meta)", marginTop: 6 }}>
        Everything that matters arrives here as a sentence. Silence when there
        is nothing worth saying.
      </p>

      <div className="card" style={{ padding: "6px 24px", marginTop: 30 }}>
        {inbox.map((entry) => (
          <div
            key={entry.id}
            className="inbox-item"
            role="button"
            tabIndex={0}
            style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
            onClick={() => markRead(entry.id)}
            onKeyDown={(e) => e.key === "Enter" && markRead(entry.id)}
          >
            <span className={`inbox-dot${entry.read ? " read" : ""}`} />
            <div style={{ flex: 1 }}>
              {entry.director && (
                <div style={{ fontSize: 11.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--gray-small)", marginBottom: 4 }}>
                  {artDirector.name}, {artDirector.title}
                </div>
              )}
              <div style={{ fontSize: 14.5, color: entry.read ? "var(--gray-meta)" : "var(--ink)" }}>
                {entry.text}
              </div>
              {entry.director?.quote && (
                <div
                  style={{
                    fontStyle: "italic",
                    fontSize: 15.5,
                    color: "var(--ink-body)",
                    borderLeft: "2px solid var(--hairline)",
                    paddingLeft: 12,
                    margin: "10px 0 2px",
                    maxWidth: 560,
                  }}
                >
                  {entry.director.quote}
                </div>
              )}
              {entry.director && (
                <div style={{ fontSize: 12, color: "var(--gray-small)", marginTop: 6 }}>
                  Evidence: {entry.director.evidence}
                </div>
              )}
              <div style={{ fontSize: 12, color: "var(--gray-meta)", marginTop: 3 }}>
                {entry.when}
              </div>
              {entry.director?.action && (
                <button
                  className="pill pill-sm"
                  style={{ marginTop: 8 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    markRead(entry.id);
                    go(entry.director!.action!.view as Parameters<typeof go>[0]);
                  }}
                >
                  {entry.director.action.label}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 34 }}>
        {unread.length > 0 ? (
          <button
            className="pill pill-dark"
            onClick={() => unread.forEach((e) => markRead(e.id))}
          >
            Mark all read
            <Sparkle size={13} />
          </button>
        ) : (
          <button className="pill pill-dark" onClick={() => go("home")}>
            All caught up. Back to the work
            <Sparkle size={13} />
          </button>
        )}
      </div>
    </Page>
  );
}
