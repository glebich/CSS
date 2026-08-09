import { useState } from "react";
import { sdk } from "../store";
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

/** The SDK surface: rows, auth-lite, key-value. Real software, real users. */
export function Sdk() {
  const [, bump] = useState(0);

  const drills = sdk.rows("drills");
  const user = sdk.auth.user();
  const streak = sdk.kv.get("streak", 0);

  function runSample() {
    drills.insert({ kind: "radio-calls", score: 0.82 });
    sdk.auth.signIn("maria@example.com");
    sdk.kv.set("streak", sdk.kv.get("streak", 0) + 1);
    bump((n) => n + 1);
  }

  return (
    <Page>
      <h1 className="statement statement-page">
        Real software, <span className="quiet">real users.</span>
      </h1>
      <p style={{ color: "var(--gray-meta)", marginTop: 6, maxWidth: 640 }}>
        Every resident carries its own isolated end-user database through a tiny
        SDK. Rows, auth-lite, and key-value. In Demo Mode it runs against local
        storage; the shape is the contract.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14, marginTop: 30 }}>
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
