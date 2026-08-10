import { readLedger, sdk, useStore } from "../store";
import { Page, Sparkle } from "../components/chrome";
import { quotas, resident } from "../data/seed";

/** Serving: the address holding files, media, and users. The home, literal. */
export function Address() {
  const { vitality, ledgerCount } = useStore();

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
      <h1 className="statement statement-page">
        The home, <span className="quiet">literal.</span>
      </h1>

      <div className="card card-pad" style={{ marginTop: 30 }}>
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
