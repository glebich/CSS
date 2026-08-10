import { personas, styleCatalog } from "../data/seed";
import { type Device, type Mood } from "../store";

/** Rectangular preview surfaces render the mobile composition, not watch. */
export function previewDevice(device: Device): Device {
  return device === "watch" ? "mobile" : device;
}

/**
 * A deterministic render of SkyRecall. The "before" is the imported app,
 * cluttered and low-contrast. The "live" render listens to everything the
 * creator chose: the style card, the mood dials, the primary persona,
 * and the device it is worn on.
 */
export function MiniApp({
  variant,
  styleId = "st-paper",
  mood = { energy: 30, style: 25, tone: 65 },
  personaId = "p-maria",
  device = "mobile",
}: {
  variant: "before" | "live";
  styleId?: string;
  mood?: Mood;
  personaId?: string;
  device?: Device;
}) {
  if (variant === "before") return <Before />;

  const style = styleCatalog.find((s) => s.id === styleId) ?? styleCatalog[0];
  const persona = personas.find((p) => p.id === personaId) ?? personas[0];

  const energetic = mood.energy >= 60;
  const bold = mood.style >= 60;
  const playful = mood.tone <= 35;
  const cta = energetic ? "Fly the drill now" : "Begin the drill";
  const greeting = playful
    ? `Good to see you, ${persona.name.split(" ")[0]}.`
    : "Welcome back.";
  const guidance =
    persona.id === "p-priya"
      ? "Checkride prep is queued first, June is close."
      : "Your recall holds at 82 percent.";
  const radius = bold ? 22 : 12;
  const compact = device === "watch";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: style.swatch,
        color: style.ink,
        padding: compact ? 16 : 26,
        display: "flex",
        flexDirection: "column",
        gap: compact ? 8 : 14,
        fontFamily: "var(--font)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <div
          style={{
            width: compact ? 18 : 24,
            height: compact ? 18 : 24,
            borderRadius: 7,
            background: style.accent,
            color: style.dark ? "#0c0c0e" : "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: compact ? 9 : 11,
            fontWeight: 700,
          }}
        >
          S
        </div>
        {!compact && (
          <span style={{ fontWeight: bold ? 700 : 600, fontSize: 14, letterSpacing: "-0.01em" }}>
            SkyRecall
          </span>
        )}
      </div>

      {!compact && (
        <div style={{ fontSize: 12.5, opacity: 0.62 }}>
          {greeting} {guidance}
        </div>
      )}

      <div
        style={{
          background: style.dark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.72)",
          borderRadius: radius,
          padding: compact ? 12 : 18,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: compact ? 6 : 10,
        }}
      >
        <span
          style={{
            fontSize: compact ? 12 : bold ? 22 : 19,
            fontWeight: bold ? 750 : 650,
            letterSpacing: "-0.01em",
          }}
        >
          {compact ? "Radio calls" : "Radio calls, ten minutes"}
        </span>
        {!compact && (
          <span style={{ fontSize: 12.5, opacity: 0.62, lineHeight: 1.5 }}>
            Runway 27L. ILS 114.30. Tower 118.7. The three calls rehearsed
            before every approach.
          </span>
        )}
        <span style={{ flex: 1 }} />
        <span
          style={{
            alignSelf: "flex-start",
            padding: compact ? "7px 13px" : "10px 20px",
            borderRadius: 999,
            background: style.accent,
            color: style.dark ? "#0c0c0e" : "#fff",
            fontSize: compact ? 10.5 : 13,
            fontWeight: 650,
          }}
        >
          {compact ? "Drill" : cta}
        </span>
      </div>
    </div>
  );
}

function Before() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(160deg, #eef2f7 0%, #e3e9f2 100%)",
        padding: 26,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        fontFamily: "var(--font)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 24,
            height: 24,
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
        <span style={{ fontWeight: 650, fontSize: 14, color: "#18202c" }}>SkyRecall</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11.5, color: "rgba(24,32,44,0.5)" }}>
          Settings &middot; Profile &middot; Stats
        </span>
      </div>
      <div
        style={{
          background: "#e8a13d",
          color: "#5a3c0a",
          borderRadius: 10,
          padding: "11px 15px",
          fontSize: 12.5,
          fontWeight: 600,
        }}
      >
        You broke your streak. 9 days since your last drill.
      </div>
      <div
        style={{
          background: "rgba(255,255,255,0.75)",
          borderRadius: 14,
          padding: 18,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 14.5, fontWeight: 650, color: "#18202c" }}>Your logbook</span>
        <span style={{ fontSize: 12.5, color: "rgba(24,32,44,0.42)" }}>
          No entries yet. Runway 27L. RWY 09R. ILS 114.30.
        </span>
        <span style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["Start drill", "View streak", "Weather brief"].map((b) => (
            <span
              key={b}
              style={{
                padding: "8px 13px",
                borderRadius: 8,
                background: "rgba(39,54,74,0.14)",
                color: "rgba(24,32,44,0.6)",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {b}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
