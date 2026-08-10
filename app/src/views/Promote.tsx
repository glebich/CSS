import { useState } from "react";
import { sdk, useStore } from "../store";
import { Page, Sparkle } from "../components/chrome";
import { audienceSummary, promoteTiers } from "../data/seed";

/**
 * The Promote tab renders now, honestly staged: four package tiers,
 * views or leads, the audience it would deliver against, and an
 * Opening soon sheet with a waitlist. No price appears anywhere.
 */
export function Promote() {
  const { go } = useStore();
  const [mode, setMode] = useState<"views" | "leads">("views");
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);

  return (
    <Page>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <h1 className="statement statement-page">
          Reach the people <span className="quiet">it was built for.</span>
        </h1>
        <span className="topbar-spacer" />
        <div className="toggle">
          <button className={mode === "views" ? "is-active" : ""} onClick={() => setMode("views")}>
            Views
          </button>
          <button className={mode === "leads" ? "is-active" : ""} onClick={() => setMode("leads")}>
            Leads
          </button>
        </div>
      </div>
      <p style={{ color: "var(--gray-meta)", marginTop: 6, maxWidth: 660 }}>
        {mode === "views"
          ? "Views are qualified impressions across the Osyle network, the Discover feed, category showcases, and transformation posts."
          : "Leads are captured intents, someone who opened, completed a first task, or left contact."}
      </p>

      <div className="card card-pad" style={{ marginTop: 26, display: "flex", gap: 14, alignItems: "center" }}>
        <span className="pulse-dot" />
        <div>
          <span style={{ fontWeight: 550 }}>{audienceSummary.name}, {audienceSummary.ageRange}</span>
          <span style={{ color: "var(--gray-meta)" }}>
            {" "}
            &middot; {audienceSummary.portrait} &middot; {audienceSummary.reach}, an estimate
          </span>
        </div>
      </div>

      <div className="tier-grid" style={{ marginTop: 16 }}>
        {promoteTiers.map((tier) => (
          <div key={tier.views} className="card card-pad">
            <div style={{ fontSize: 27, fontWeight: 550, letterSpacing: "-0.02em" }}>
              {mode === "views" ? tier.views : tier.leads}
            </div>
            <div style={{ fontSize: 12, color: "var(--gray-meta)", marginTop: 2 }}>
              {mode === "views" ? "qualified views" : "captured leads"}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--gray-meta)", marginTop: 14 }}>
              Delivers in {tier.timeline}, to this audience.
            </div>
          </div>
        ))}
      </div>

      <div className="card card-pad" style={{ marginTop: 26, textAlign: "center" }}>
        <div style={{ fontSize: 17, fontWeight: 550 }}>Opening soon</div>
        <p style={{ color: "var(--gray-meta)", marginTop: 6, maxWidth: 520, margin: "6px auto 0" }}>
          Promotion opens when the network has the density to deliver honestly.
          Leave your address and you will hear the day it does.
        </p>
        {joined ? (
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <p style={{ fontWeight: 510 }}>You are on the list.</p>
            <button className="pill" onClick={() => go("home")}>
              Back to the work
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 18 }}>
            <div className="ask-pill" style={{ minWidth: 260, boxShadow: "var(--shadow-pill)" }}>
              <input
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button
              className="pill pill-dark"
              disabled={!email.includes("@")}
              onClick={() => {
                sdk.rows("waitlist").insert({ email });
                setJoined(true);
              }}
            >
              Join the waitlist
              <Sparkle size={13} />
            </button>
          </div>
        )}
      </div>
    </Page>
  );
}
