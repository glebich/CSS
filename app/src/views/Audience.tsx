import { useEffect, useRef, useState } from "react";
import { useStore, type StoredArchetype } from "../store";
import { Page, Sparkle } from "../components/chrome";
import { discoveryProposals, formatReach, reachEstimate } from "../data/seed";

/**
 * The Audience: the people the resident is built to win. Two ways to
 * set it, one screen: describe them in a sentence, or adopt what the
 * evidence proposes. The primary archetype carries the funnel dial,
 * the product's signature control: one band, the reach number large.
 * Targeting is age, context, and interest only, by construction.
 */

/** The reach numeral eases toward its target, so the dial feels alive.
    The animation lives in the effect; state updaters stay pure. */
function useEasedNumber(target: number): number {
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const cur = shownRef.current;
      const next = cur + (target - cur) * 0.18;
      const done = Math.abs(next - target) < Math.max(1, target * 0.002);
      shownRef.current = done ? target : next;
      setShown(shownRef.current);
      if (!done) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return Math.round(shown);
}

/** The funnel dial: an age band with two handles and one large truth. */
function FunnelDial({ archetype }: { archetype: StoredArchetype }) {
  const { setArchetypeRange, toggleArchetypeTrait } = useStore();
  const [lo, hi] = archetype.ageRange;
  const target = reachEstimate(archetype, archetype.ageRange, archetype.activeTraits.length);
  const shown = useEasedNumber(target);
  const MIN = 18;
  const MAX = 75;
  const pct = (v: number) => ((v - MIN) / (MAX - MIN)) * 100;

  return (
    <div style={{ marginTop: 18 }}>
      <div className="reach-numeral">{formatReach(shown)}</div>
      <div style={{ fontSize: 11, color: "var(--gray-small)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 }}>
        An estimate
      </div>
      <div className="dial-band" style={{ marginTop: 16 }}>
        <div
          className="dial-fill"
          style={{ left: `${pct(lo)}%`, width: `${pct(hi) - pct(lo)}%` }}
        />
        <input
          type="range"
          className="dial-input"
          min={MIN}
          max={MAX}
          value={lo}
          aria-label="Youngest age"
          onChange={(e) => {
            const v = Math.min(Number(e.target.value), hi - 3);
            setArchetypeRange(archetype.id, [v, hi]);
          }}
        />
        <input
          type="range"
          className="dial-input"
          min={MIN}
          max={MAX}
          value={hi}
          aria-label="Oldest age"
          onChange={(e) => {
            const v = Math.max(Number(e.target.value), lo + 3);
            setArchetypeRange(archetype.id, [lo, v]);
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--gray-meta)", marginTop: 8 }}>
        <span>{lo}</span>
        <span>
          {lo} to {hi}
        </span>
        <span>{hi}</span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
        {archetype.traits.map((trait) => {
          const on = archetype.activeTraits.includes(trait);
          return (
            <button
              key={trait}
              className={`pill pill-sm${on ? "" : ""}`}
              style={on ? { boxShadow: "inset 0 0 0 1.5px var(--ink-strong)" } : undefined}
              onClick={() => toggleArchetypeTrait(archetype.id, trait)}
            >
              {trait}
            </button>
          );
        })}
        <span style={{ fontSize: 11.5, color: "var(--gray-small)", alignSelf: "center" }}>
          Each trait narrows the funnel
        </span>
      </div>
    </div>
  );
}

function ArchetypeCard({ archetype, primary }: { archetype: StoredArchetype; primary: boolean }) {
  const { setPrimaryArchetype, removeArchetype, audience } = useStore();
  return (
    <div className="card card-pad" style={primary ? { boxShadow: "0 0 0 1.5px var(--ink-strong), var(--shadow-card)" } : undefined}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 17, fontWeight: 550 }}>{archetype.name}</span>
        {primary ? (
          <span className="chip">Primary</span>
        ) : (
          <button className="pill pill-sm" onClick={() => setPrimaryArchetype(archetype.id)}>
            Make primary
          </button>
        )}
        <span className="topbar-spacer" />
        {audience.archetypes.length > 1 && (
          <button
            className="topbar-quiet"
            onClick={() => removeArchetype(archetype.id)}
            aria-label={`Remove ${archetype.name}`}
          >
            Remove
          </button>
        )}
      </div>
      <p style={{ fontStyle: "italic", color: "var(--ink-body)", marginTop: 8 }}>{archetype.portrait}</p>
      <div style={{ display: "grid", gap: 4, marginTop: 10, fontSize: 13, color: "var(--gray-meta)" }}>
        <span>Context: {archetype.context}</span>
        <span>Wants: {archetype.motivation}</span>
        <span>Fears: {archetype.fear}</span>
      </div>
      {archetype.caption && (
        <p style={{ fontSize: 12, color: "var(--gray-small)", marginTop: 8 }}>{archetype.caption}</p>
      )}
      {archetype.adoptedWhy && (
        <p style={{ fontSize: 12, color: "var(--gray-small)", marginTop: 8 }}>
          Adopted on evidence: {archetype.adoptedWhy}
        </p>
      )}
      {primary && <FunnelDial archetype={archetype} />}
    </div>
  );
}

export function Audience() {
  const { audience, describeAudience, adoptArchetype } = useStore();
  const [text, setText] = useState("");
  const primary = audience.archetypes.find((a) => a.id === audience.primaryId);

  return (
    <Page>
      <h1 className="statement statement-page">
        The people <span className="quiet">it should win.</span>
      </h1>
      <p style={{ color: "var(--gray-meta)", marginTop: 6, maxWidth: 640 }}>
        Every resident carries an audience. The primary archetype shapes how
        the app renders, what the benchmarks compare against, and who
        promotion would reach. Age, context, and interest only, by
        construction.
      </p>

      {/* Describe them */}
      <div style={{ display: "flex", gap: 10, marginTop: 22, alignItems: "center", flexWrap: "wrap" }}>
        <div className="ask-pill ask-pill-wide">
          <input
            placeholder="e.g. pilots who fly rarely and fear getting rusty"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && text.trim()) {
                describeAudience(text.trim());
                setText("");
              }
            }}
          />
        </div>
        <button
          className="pill pill-dark"
          disabled={!text.trim()}
          onClick={() => {
            describeAudience(text.trim());
            setText("");
          }}
        >
          Compose the archetype
          <Sparkle size={13} />
        </button>
      </div>

      {/* The archetypes, up to three, one primary */}
      <div style={{ display: "grid", gap: 14, marginTop: 22 }}>
        {audience.archetypes.map((a) => (
          <ArchetypeCard key={a.id} archetype={a} primary={a.id === audience.primaryId} />
        ))}
      </div>

      {primary && (
        <p style={{ fontSize: 12.5, color: "var(--gray-small)", marginTop: 14 }}>
          Benchmarks compare within {primary.category}. The resident renders
          for {primary.name.toLowerCase()}: scale, pace, and density follow
          the dial.
        </p>
      )}

      {/* Or let the system find them */}
      <div className="section-label" style={{ marginTop: 36 }}>
        Or let the evidence propose them
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {discoveryProposals.map(({ archetype, rationale }, i) => {
          const adopted = audience.archetypes.some((a) => a.id === archetype.id);
          return (
            <div key={archetype.id} className="card card-pad" style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--gray-small)", fontVariantNumeric: "tabular-nums" }}>
                {i + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 550 }}>{archetype.name}</span>
                <p style={{ fontSize: 13, color: "var(--gray-meta)", marginTop: 4 }}>{rationale}</p>
              </div>
              {adopted ? (
                <span className="chip">Adopted</span>
              ) : (
                <button className="pill pill-sm" onClick={() => adoptArchetype(archetype, rationale)}>
                  Adopt
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Page>
  );
}
