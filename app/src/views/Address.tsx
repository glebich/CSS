import { useState } from "react";
import { readLedger, sdk, useStore } from "../store";
import { FlowSteps, Page, Sparkle } from "../components/chrome";
import { quotas, resident } from "../data/seed";
import type { AnalyzedProject } from "../engine/types";
import { buildStoreKit } from "../engine/storekit";
import { bumpGrowth } from "../engine/reportcard";
import { styleCatalog } from "../data/seed";

/** The kit downloads complete, per the spec, from real state only. */
function downloadStoreKit(slug: string, project: AnalyzedProject, styleId: string) {
  const s = styleCatalog.find((c) => c.id === styleId) ?? styleCatalog[0];
  const bytes = buildStoreKit(project, {
    name: s.name,
    ink: s.ink,
    accent: s.accent,
    radius: s.radius,
    dark: s.dark,
  });
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug}-store-kit.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

/** The way out is always open: files, report, and ledger in one download. */
function exportReal(slug: string, project: AnalyzedProject) {
  const payload = {
    slug,
    name: project.inventory.name,
    vitality: project.vitality,
    exportedAt: new Date().toISOString(),
    findings: project.lenses.flatMap((l) => l.findings),
    files: [...project.files.values()]
      .filter((f) => f.text !== null)
      .map((f) => ({ path: f.path, text: f.text })),
    decisionLedger: readLedger(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug}-export.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Serving: the address holding files, media, and users. The home, literal. */
export function Address() {
  const { vitality, ledgerCount, realSlug, project, styleId, stack, stackClaim, claimOnStack } =
    useStore();
  const [copied, setCopied] = useState(false);
  const [invited, setInvited] = useState(false);
  const [claimEmail, setClaimEmail] = useState("");
  const [claimError, setClaimError] = useState<string | null>(null);

  /* The real ceremony: a dropped, examined app just moved in. */
  if (realSlug && project) {
    const fileCount = [...project.files.values()].filter((f) => f.text !== null).length;
    return (
      <Page>
        <FlowSteps current="address" />
        <div style={{ textAlign: "left", padding: "10px 0 8px" }}>
          <h1 className="statement statement-page">
            It lives <span className="quiet">here now.</span>
          </h1>
          <div
            style={{
              fontSize: "clamp(22px, 3vw, 34px)",
              fontWeight: 510,
              letterSpacing: "-0.01em",
              marginTop: 18,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {realSlug}.osyle.app
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button
              className="pill pill-sm"
              onClick={() => {
                navigator.clipboard?.writeText(`https://${realSlug}.osyle.app`).catch(() => undefined);
                setCopied(true);
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
            <a
              className="pill pill-sm"
              href={`#/r/${realSlug}`}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: "none" }}
            >
              Open
            </a>
          </div>
          <p style={{ fontSize: 13, color: "var(--gray-small)", marginTop: 14 }}>
            Served from this machine for now. The public address ships with
            hosted Osyle.
          </p>
        </div>

        <div className="card card-pad" style={{ marginTop: 26 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="pulse-dot" />
            <span style={{ fontSize: 19, fontWeight: 550 }}>{project.inventory.name}</span>
            <span className="chip">Alive at Osyle</span>
            <span className="topbar-spacer" />
            <span style={{ fontSize: 13, color: "var(--gray-meta)" }}>
              Vitality {project.vitality} at move-in
            </span>
          </div>
          <p style={{ color: "var(--gray-meta)", marginTop: 10, maxWidth: 620 }}>
            The address holds {fileCount} readable file{fileCount === 1 ? "" : "s"} and
            serves your page in a sandbox, exactly as it arrived. No GitHub, no
            deploy pipeline, no build queue. Drop a newer version any time and
            the examination runs again.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 40, flexWrap: "wrap" }}>
          <button className="pill" onClick={() => exportReal(realSlug, project)}>
            Export everything
          </button>
          <button className="pill" onClick={() => downloadStoreKit(realSlug, project, styleId)}>
            Download the store kit
          </button>
          <button
            className="pill"
            onClick={() => {
              navigator.clipboard
                ?.writeText(`${location.origin}${location.pathname}`)
                .catch(() => undefined);
              bumpGrowth("invites");
              setInvited(true);
            }}
          >
            {invited ? "Invite copied" : "Invite a builder"}
          </button>
          <a
            className="pill pill-dark"
            href={`#/r/${realSlug}`}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: "none" }}
          >
            Visit it at its address
            <Sparkle size={13} />
          </a>
        </div>
        {/* Real Mode: the stack, spoken to honestly */}
        {stack.on && stack.up === false && (
          <p style={{ textAlign: "left", fontSize: 12.5, color: "var(--gray-small)", marginTop: 22 }}>
            Real Mode is on, but the stack at {stack.base} is not answering.
            Everything above still works from this machine.
          </p>
        )}
        {stack.on && stack.up && !stackClaim && (
          <div className="card card-pad" style={{ marginTop: 26, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
            <div style={{ fontWeight: 550 }}>The stack is answering</div>
            <p style={{ fontSize: 13, color: "var(--gray-meta)", marginTop: 6 }}>
              Claim the address on it and the resident is registered
              server side, tied to your email by a magic link.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <div className="ask-pill" style={{ minWidth: 240, flex: 1 }}>
                <input
                  placeholder="you@yourdomain.com"
                  value={claimEmail}
                  onChange={(e) => setClaimEmail(e.target.value)}
                />
              </div>
              <button
                className="pill pill-sm"
                onClick={async () => {
                  setClaimError(null);
                  const err = await claimOnStack(claimEmail.trim());
                  if (err) setClaimError(err);
                }}
              >
                Claim it on the stack
              </button>
            </div>
            {claimError && (
              <p style={{ fontSize: 12.5, color: "var(--gray-meta)", marginTop: 8 }}>{claimError}</p>
            )}
          </div>
        )}
        {stackClaim && (
          <div className="card card-pad fade-in" style={{ marginTop: 26, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="pulse-dot" />
              <span style={{ fontWeight: 550 }}>Claimed. {stackClaim.address} is registered on the stack.</span>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--gray-meta)", marginTop: 8 }}>
              {stackClaim.uploaded > 0
                ? `${stackClaim.uploaded} file${stackClaim.uploaded === 1 ? "" : "s"} in the Vault, versioned from day one. ${stackClaim.note}`
                : stackClaim.note}
            </p>
          </div>
        )}
        <p
          style={{
            textAlign: "left",
            fontSize: 12.5,
            color: "var(--gray-small)",
            marginTop: 26,
            letterSpacing: "0.02em",
          }}
        >
          A tool makes software. A home keeps it alive.
        </p>
      </Page>
    );
  }

  function exportEverything() {
    const payload = {
      resident,
      vitality,
      exportedAt: new Date().toISOString(),
      database: {
        drills: sdk.rows("drills").list(),
        waitlist: sdk.rows("waitlist").list(),
        user: sdk.auth.user(),
      },
      /* every judgment ever made here, appended in order, yours */
      decisionLedger: readLedger(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${resident.slug}-export.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Page>
      <div style={{ textAlign: "left", padding: "10px 0 8px" }}>
        <h1 className="statement statement-page">
          It lives <span className="quiet">here now.</span>
        </h1>
        <div
          style={{
            fontSize: "clamp(22px, 3vw, 34px)",
            fontWeight: 510,
            letterSpacing: "-0.01em",
            marginTop: 18,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {resident.address}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button
            className="pill pill-sm"
            onClick={() => {
              navigator.clipboard?.writeText(`https://${resident.address}`).catch(() => undefined);
              setCopied(true);
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <a
            className="pill pill-sm"
            href={`#/r/${resident.slug}`}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: "none" }}
          >
            Open
          </a>
        </div>
        <p style={{ fontSize: 13, color: "var(--gray-small)", marginTop: 14 }}>
          Watched from this moment on.
        </p>
      </div>

      <div className="card card-pad" style={{ marginTop: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="pulse-dot" />
          <span style={{ fontSize: 19, fontWeight: 550 }}>{resident.address}</span>
          <span className="chip">Alive at Osyle</span>
          <span className="topbar-spacer" />
          <span style={{ fontSize: 13, color: "var(--gray-meta)" }}>
            v{resident.version}, imported from {resident.importedFrom}
          </span>
        </div>
        <p style={{ color: "var(--gray-meta)", marginTop: 10, maxWidth: 620 }}>
          {resident.oneLiner} Serving its files, its media, and its own isolated
          resident database. Export back out in one click, always.
          {ledgerCount > 0 &&
            ` The decision ledger holds ${ledgerCount} judgment${ledgerCount === 1 ? "" : "s"}, appended in order, included in the export.`}
        </p>
      </div>

      <div className="section-label" style={{ marginTop: 34 }}>
        Quotas, generous and visible
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        <QuotaCard label="Storage" used={quotas.storage.used} total={quotas.storage.total} frac={0.04} />
        <QuotaCard label="Bandwidth" used={quotas.bandwidth.used} total={quotas.bandwidth.total} frac={0.018} />
        <QuotaCard label="Database rows" used={quotas.dbRows.used} total={quotas.dbRows.total} frac={0.0024} />
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 40 }}>
        <button className="pill pill-dark" onClick={exportEverything}>
          Export everything
          <Sparkle size={13} />
        </button>
      </div>
    </Page>
  );
}

function QuotaCard({
  label,
  used,
  total,
  frac,
}: {
  label: string;
  used: string;
  total: string;
  frac: number;
}) {
  return (
    <div className="card card-pad">
      <div className="instrument-label">{label}</div>
      <div style={{ fontSize: 22, fontWeight: 550, marginTop: 8, letterSpacing: "-0.02em" }}>
        {used}
        <span style={{ color: "var(--gray-meta)", fontSize: 13, fontWeight: 500 }}>
          {" "}
          of {total}
        </span>
      </div>
      <div
        style={{
          marginTop: 12,
          height: 4,
          borderRadius: 2,
          background: "rgba(20,18,16,0.06)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.max(1.2, frac * 100)}%`,
            height: "100%",
            borderRadius: 2,
            background: "var(--pulse)",
          }}
        />
      </div>
    </div>
  );
}
