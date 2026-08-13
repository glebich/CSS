import { useEffect, useState } from "react";
import { sdk, useStore } from "../store";
import { Page, Sparkle } from "../components/chrome";

const SAMPLE = `import { createClient } from "@osyle/sdk";

const db = createClient("skyrecall");

// Rows: the resident's own isolated database
const drill = db.rows("drills").insert({
  kind: "radio-calls",
  score: 0.82,
});

// Auth-lite: magic-link shaped, no passwords ever
const pilot = db.auth.signIn("maria@example.com");

// Key-value: small facts worth remembering
db.kv.set("streak", db.kv.get("streak", 0) + 1);`;

function storedKey(slug: string | null): string | null {
  if (!slug) return null;
  try {
    const raw = localStorage.getItem("osyle.keys");
    return raw ? ((JSON.parse(raw) as Record<string, string>)[slug] ?? null) : null;
  } catch {
    return null;
  }
}

/** The client this app would actually import, written with its own
    address, its own transport, and its own key when it has one. */
function clientFor(slug: string, base: string, key: string | null): string {
  const head = key
    ? `const db = createClient("${slug}", {\n  transport: "http",\n  baseUrl: "${base}",\n  key: "${key}",\n});`
    : `const db = createClient("${slug}");\n\n// The http transport and this app's key arrive with the claim on\n// the stack. Until then the same calls run on local storage.`;
  return `import { createClient } from "@osyle/sdk";

${head}

// Rows: this app's own isolated database
db.rows("sessions").insert({ kind: "first", ok: true });

// Auth-lite: magic-link shaped, no passwords ever
db.auth.signIn("someone@example.com");

// Key-value: small facts worth remembering
db.kv.set("streak", 1);`;
}

/**
 * The SDK room for a real app: the client it would import, written
 * with its own name, and an honest word on where its database stands.
 * No borrowed users, and no users invented for it.
 */
function RealSdk() {
  const { project, realSlug, stack, go, togglePanel } = useStore();
  const [copied, setCopied] = useState(false);
  const [answers, setAnswers] = useState<boolean | null>(null);
  const slug = realSlug ?? "your-app";
  const key = storedKey(realSlug);
  const snippet = clientFor(slug, stack.base, key);

  useEffect(() => {
    if (!stack.on || stack.up !== true || !realSlug || !key) return;
    fetch(`${stack.base}/rdb/${realSlug}/rows/sessions/count`, {
      headers: { "x-osyle-key": key },
    })
      .then((r) => setAnswers(r.ok))
      .catch(() => setAnswers(false));
  }, [stack.on, stack.up, stack.base, realSlug, key]);

  return (
    <Page>
      <h1 className="statement statement-page">
        Your app&apos;s own <span className="quiet">database.</span>
      </h1>
      <p style={{ color: "var(--gray-meta)", marginTop: 8, maxWidth: 660 }}>
        {project?.inventory.name ?? "This app"} carries an isolated end-user
        database: rows, sign-in without passwords, and small facts that survive
        a refresh, with no backend to build. Below is the client it would
        import, written with its own name.
      </p>

      <div className="section-label" style={{ marginTop: 30 }}>
        Where the database stands
      </div>
      <div className="card card-pad" style={{ maxWidth: 660 }}>
        <div style={{ fontSize: 15, fontWeight: 510 }}>
          {answers === true
            ? "Open and answering"
            : key
              ? answers === false
                ? "The stack holds it, but the door did not answer"
                : "Asking the stack"
              : "Waiting for the claim"}
        </div>
        <p style={{ color: "var(--gray-meta)", fontSize: 13, marginTop: 8 }}>
          {answers === true
            ? `The database is live at ${stack.base}/rdb/${slug}, and it opens only for this app's key. Rows appear here once the app ships with the client below wired in; nothing is written for it in the meantime.`
            : key
              ? "The key is in your hands and the resident exists. If this persists, check that the stack is running."
              : "Claim the app on the stack from the address, and its database, its key, and the http transport all arrive together."}
        </p>
      </div>

      <div className="section-label" style={{ marginTop: 30 }}>
        The client, yours to paste
      </div>
      <pre
        className="mono card card-solid"
        style={{
          padding: 22,
          whiteSpace: "pre-wrap",
          color: "var(--ink-soft)",
          lineHeight: 1.7,
          maxWidth: 720,
        }}
      >
        {snippet}
      </pre>

      <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 34 }}>
        <button
          className="pill pill-dark"
          onClick={() => {
            navigator.clipboard?.writeText(snippet).catch(() => undefined);
            setCopied(true);
          }}
        >
          {copied ? "Copied" : "Copy the client"}
          <Sparkle size={13} />
        </button>
        <button className="pill" onClick={() => togglePanel("resident")}>
          Your app
        </button>
        <button className="pill" onClick={() => go("home")}>
          Back to the home
        </button>
      </div>
    </Page>
  );
}

/** The SDK surface: rows, auth-lite, key-value. Real software, real users. */
export function Sdk() {
  const [, bump] = useState(0);
  const { go, togglePanel, project } = useStore();

  /* a real app gets its own client and its own database; the pilots
     below are the example's people and stay with the example */
  if (project) return <RealSdk />;

  const drills = sdk.rows("drills");
  const user = sdk.auth.user();
  const streak = sdk.kv.get("streak", 0);

  function runSample() {
    drills.insert({ kind: "radio-calls", score: 0.82 });
    sdk.auth.signIn("maria@example.com");
    sdk.kv.set("streak", sdk.kv.get("streak", 0) + 1);
    bump((n) => n + 1);
  }

  /* the people inside: real local rows first, the example labeled */
  const drillRows = drills.list();
  const lastDrill = drillRows[drillRows.length - 1];
  const examplePilots = [
    { name: "Maria Chen", doing: "9 drills, a 6 day streak", last: "today, 07:40", state: "returning weekly" },
    { name: "Tom Alvarez", doing: "4 drills, weather brief opened twice", last: "Saturday", state: "weekend rhythm" },
    { name: "Priya Nair", doing: "2 drills, stopped at the briefing", last: "August 5", state: "stalled at the weather card" },
  ];

  return (
    <Page>
      <h1 className="statement statement-page">
        Real software, <span className="quiet">real users.</span>
      </h1>

      {/* who is inside, what they do, and where they stall */}
      <div className="section-label" style={{ marginTop: 22 }}>
        The people inside
      </div>
      <div className="card card-solid people-table" style={{ padding: "6px 24px" }}>
        <div className="inbox-item">
          <span className="pulse-dot" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 550 }}>
              {user ? String(user.email) : "You, unsigned"}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--gray-meta)", marginTop: 2 }}>
              {drillRows.length} drill{drillRows.length === 1 ? "" : "s"} on this machine, streak {streak}
              {lastDrill ? `, last ${String(lastDrill.createdAt).slice(0, 10)}` : ""}
            </div>
          </div>
          <span className="chip">Yours, live</span>
        </div>
        {examplePilots.map((p) => (
          <div key={p.name} className="inbox-item">
            <span className="pulse-dot" style={{ animation: "none" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 550 }}>{p.name}</div>
              <div style={{ fontSize: 12.5, color: "var(--gray-meta)", marginTop: 2 }}>
                {p.doing}. Last seen {p.last}. {p.state}.
              </div>
            </div>
            <span className="chip">Example</span>
          </div>
        ))}
      </div>
      {/* the journey: where each person is, and where they stop.
          Counts mix you, live, with the three example pilots, said so. */}
      <div className="section-label" style={{ marginTop: 26 }}>
        The journey
      </div>
      <div className="journey-board">
        {(() => {
          const signed = user ? 1 : 0;
          const drilled = drillRows.length > 0 ? 1 : 0;
          const returned = streak > 1 ? 1 : 0;
          const stages = [
            { label: "Arrive", count: 3 + 1, stuck: null as string | null, act: null as (() => void) | null, actLabel: null as string | null },
            {
              label: "Sign in",
              count: 3 + signed,
              stuck: signed ? null : "You have not signed in on this machine",
              act: null,
              actLabel: null,
            },
            {
              label: "First drill",
              count: 3 + drilled,
              stuck: drilled ? null : "Your first drill is one tap away",
              act: () => togglePanel("run"),
              actLabel: "Run the drill",
            },
            {
              label: "Keep returning",
              count: 2 + returned,
              stuck: "Priya Nair stalled at the weather card",
              act: () => go("monitor"),
              actLabel: "See the stall",
            },
          ];
          const top = stages[0].count;
          return stages.map((s, i) => (
            <div key={s.label} className="journey-stage card card-pad">
              <span className="instrument-label">{s.label}</span>
              <div className="journey-count">{s.count}</div>
              <div className="journey-track">
                <div className="journey-fill" style={{ width: `${Math.round((s.count / top) * 100)}%` }} />
              </div>
              {i > 0 && stages[i - 1].count > s.count && (
                <span className="journey-drop">
                  {stages[i - 1].count - s.count} lost after {stages[i - 1].label.toLowerCase()}
                </span>
              )}
              {s.stuck && <p className="journey-stuck">{s.stuck}</p>}
              {s.act && s.actLabel && (
                <button className="pill pill-sm" onClick={s.act}>
                  {s.actLabel}
                </button>
              )}
            </div>
          ));
        })()}
      </div>
      <p style={{ fontSize: 12, color: "var(--gray-small)", marginTop: 8 }}>
        You count live; the three pilots are the example, labeled above.
      </p>
      <p style={{ color: "var(--gray-meta)", marginTop: 6, maxWidth: 640 }}>
        Every resident carries its own isolated end-user database through a tiny
        SDK. Rows, auth-lite, and key-value. In Demo Mode it runs against local
        storage; the shape is the contract.
      </p>

      {/* the snippet says why it earns its place before it speaks code */}
      <div className="section-label" style={{ marginTop: 30 }}>
        What your app can do because it lives here
      </div>
      <p style={{ fontSize: 13, color: "var(--gray-meta)", maxWidth: 640 }}>
        Three lines give your app memory, sign-in, and small facts that
        survive a refresh, with no backend to build. The numbers on the
        right are this page running those exact lines, live.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14, marginTop: 14 }}>
        <pre
          className="mono card card-solid"
          style={{ padding: 22, whiteSpace: "pre-wrap", color: "var(--ink-soft)", lineHeight: 1.7 }}
        >
          {SAMPLE}
        </pre>
        <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <div className="card card-pad">
            <div className="instrument-label">Rows in drills</div>
            <div style={{ fontSize: 30, fontWeight: 550, marginTop: 6 }}>{drills.count()}</div>
          </div>
          <div className="card card-pad">
            <div className="instrument-label">Signed in</div>
            <div style={{ fontSize: 15, fontWeight: 550, marginTop: 6 }}>
              {user ? user.email : "No one yet"}
            </div>
          </div>
          <div className="card card-pad">
            <div className="instrument-label">kv streak</div>
            <div style={{ fontSize: 30, fontWeight: 550, marginTop: 6 }}>{streak}</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 36 }}>
        <button className="pill pill-dark" onClick={runSample}>
          Run the sample
          <Sparkle size={13} />
        </button>
      </div>
    </Page>
  );
}
