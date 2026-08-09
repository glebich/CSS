/**
 * A deterministic render of SkyRecall for the before-and-after slider.
 * The resident's own identity is allowed to glow through its preview,
 * a cool aviation blue. The shell around it stays paper.
 */
export function MiniApp({ variant }: { variant: "before" | "after" }) {
  const before = variant === "before";
  const inkOn = before ? "rgba(24,32,44,0.42)" : "rgba(18,24,34,0.92)";
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(160deg, #eef2f7 0%, #e3e9f2 100%)",
        padding: 28,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        fontFamily: "var(--font)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            background: "#27364a",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          S
        </div>
        <span style={{ fontWeight: 650, fontSize: 15, color: "#18202c" }}>
          SkyRecall
        </span>
        <span style={{ flex: 1 }} />
        {before && (
          <span style={{ fontSize: 12, color: "rgba(24,32,44,0.5)" }}>
            Settings &middot; Profile &middot; Stats
          </span>
        )}
      </div>

      {before ? (
        <div
          style={{
            background: "#e8a13d",
            color: "#5a3c0a",
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          You broke your streak. 9 days since your last drill.
        </div>
      ) : (
        <div style={{ fontSize: 13, color: "rgba(24,32,44,0.55)" }}>
          Welcome back. Your recall holds at 82 percent.
        </div>
      )}

      <div
        style={{
          background: "rgba(255,255,255,0.75)",
          borderRadius: 14,
          padding: 20,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <span style={{ fontSize: before ? 15 : 21, fontWeight: 650, color: "#18202c", letterSpacing: "-0.01em" }}>
          {before ? "Your logbook" : "Radio calls, ten minutes"}
        </span>
        {before ? (
          <span style={{ fontSize: 13, color: inkOn }}>
            No entries yet. Runway 27L. RWY 09R. ILS 114.30.
          </span>
        ) : (
          <span style={{ fontSize: 13.5, color: "rgba(24,32,44,0.65)" }}>
            Runway 27L. ILS 114.30. Tower 118.7. The three calls you rehearse
            before every approach.
          </span>
        )}
        <span style={{ flex: 1 }} />
        {before ? (
          <div style={{ display: "flex", gap: 8 }}>
            {["Start drill", "View streak", "Weather brief"].map((b) => (
              <span
                key={b}
                style={{
                  padding: "9px 14px",
                  borderRadius: 8,
                  background: "rgba(39,54,74,0.14)",
                  color: "rgba(24,32,44,0.6)",
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
                {b}
              </span>
            ))}
          </div>
        ) : (
          <span
            style={{
              alignSelf: "flex-start",
              padding: "11px 22px",
              borderRadius: 999,
              background: "#18202c",
              color: "#fff",
              fontSize: 13.5,
              fontWeight: 600,
            }}
          >
            Begin the drill
          </span>
        )}
      </div>
    </div>
  );
}
