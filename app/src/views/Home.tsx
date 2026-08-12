import { useEffect, useRef, useState } from "react";
import { currentState, useStore } from "../store";
import { Icon, Page, Sparkle } from "../components/chrome";
import { artDirector, issues, pulseLineAfterHeal, pulseLineAtRest } from "../data/seed";

function keyStillBroken(healed: Set<string>): boolean {
  return currentState("weather-key", healed) !== "healed";
}

/** The numeral counts up once on arrival from Launch: the earned reveal. */
function useRevealCount(target: number, animate: boolean): number {
  const [value, setValue] = useState(animate ? 0 : target);
  const done = useRef(!animate);
  useEffect(() => {
    if (done.current) {
      setValue(target);
      return;
    }
    done.current = true;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 700);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, animate]);
  return value;
}

/**
 * The home surface, hard rules kept: at rest, three numbers, one pulse
 * line, one CTA. The CTA always names the next step; when nothing needs
 * you, it says so, because that trust is the return loop.
 */
export function Home() {
  const {
    vitality,
    heal,
    healing,
    healableOpen,
    healed,
    go,
    justLaunched,
    clearLaunchArrival,
    returned,
    dismissReturn,
    transformAccepted,
    inbox,
    project,
    realDecisions,
    realSlug,
    togglePanel,
  } = useStore();
  const [reveal] = useState(justLaunched);
  useEffect(() => {
    if (justLaunched) clearLaunchArrival();
  }, [justLaunched, clearLaunchArrival]);
  const shown = useRevealCount(project ? project.vitality : vitality, reveal);
  const healedSomething = healed.size > 1; // the guilt banner starts healed in the seed
  const unread = inbox.filter((e) => !e.read).length;
  const healables = issues.filter((i) => healableOpen.includes(i.id));
  /* the address this home serves: the example's, or the real one */
  const homeSlug = project ? realSlug : "skyrecall";

  /* A real project speaks with its own numbers, never the example's. */
  const realFindings = project ? project.lenses.flatMap((l) => l.findings) : [];
  const realUndecided = realFindings.filter((f) => !realDecisions[f.id]);
  const pulseLine = project
    ? realUndecided.length > 0
      ? `Examined. ${realUndecided.length} finding${realUndecided.length === 1 ? "" : "s"} wait on your judgment.`
      : "Every finding decided. The plan is yours."
    : healedSomething
      ? pulseLineAfterHeal
      : pulseLineAtRest;

  return (
    <Page>
      {returned && !project && (
        <div className="card card-solid since-card fade-in">
          <div className="since-label">Since you left</div>
          <p style={{ fontSize: 15, lineHeight: 1.6, marginTop: 10, color: "var(--ink-body)" }}>
            SkyRecall stayed up and served its pilots. Nine sessions today,
            four stalled at the weather briefing, the broken key is still the
            likely cause. Vitality held at {vitality}.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 16, alignItems: "center" }}>
            <button className="pill pill-sm" onClick={() => { dismissReturn(); go("inbox"); }}>
              Catch up in the Inbox{unread > 0 ? `, ${unread} new` : ""}
            </button>
            <button className="topbar-quiet" onClick={dismissReturn} style={{ padding: 0 }}>
              Skip
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          paddingTop: returned ? 0 : 18,
        }}
      >
        {/* the arrival: this is the home, and the app is reachable */}
        <h1 className="statement statement-page" style={{ textAlign: "center" }}>
          It lives <span className="quiet">here now.</span>
        </h1>
        <div
          className="card card-solid"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 18px",
            marginTop: 10,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <span className="pulse-dot" />
          <span style={{ fontWeight: 550, fontSize: 15 }}>
            {project ? project.inventory.name : "SkyRecall"}
          </span>
          {/* the address is a door: the domain changes in the panel it opens */}
          <button
            className="chip chip-door"
            title="Change the domain in the panel this opens"
            onClick={() => togglePanel("resident")}
          >
            {homeSlug ? `${homeSlug}.osyle.app` : "no address yet"}
            <Icon name="edit" size={11} />
          </button>
          {homeSlug ? (
            <>
              <a
                className="pill pill-sm"
                href={`#/r/${homeSlug}`}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: "none" }}
              >
                Open your app
              </a>
              <button
                className="pill pill-sm"
                onClick={() =>
                  navigator.clipboard?.writeText(`https://${homeSlug}.osyle.app`).catch(() => undefined)
                }
              >
                Copy the link
              </button>
            </>
          ) : (
            <button className="pill pill-sm" onClick={() => go("report")}>
              Give it the address, at the end of the report
            </button>
          )}
        </div>

        <span className="instrument-label" style={{ marginTop: 26 }}>
          Vitality
        </span>
        <button
          className="instrument"
          style={{ fontSize: "clamp(96px, 13vw, 170px)" }}
          onClick={() => go(project ? "report" : "exam")}
          title={project ? "See the report" : "See the ten lenses"}
        >
          {shown}
        </button>
        <p
          style={{
            fontSize: 13,
            color: "var(--gray-small)",
            maxWidth: 460,
            textAlign: "center",
            lineHeight: 1.55,
          }}
        >
          Vitality is your app&apos;s health, 0 to 100, weighed across ten
          lenses at the last examination. Tap the number for the why.
        </p>

        <div className="pulse-line" style={{ marginTop: 10 }}>
          <span className={`pulse-dot${healedSomething ? " swell" : ""}`} />
          <span>{pulseLine}</span>
        </div>

        {/* the unprompted note: the director spoke, the door is quiet */}
        {!project && inbox.some((e) => !e.read && e.director) && (
          <button
            className="pill pill-sm fade-in"
            style={{ marginTop: 14 }}
            onClick={() => go("inbox")}
          >
            {artDirector.name}, {artDirector.title}, left you a note
          </button>
        )}

        <div
          style={{
            display: "flex",
            gap: 40,
            marginTop: 32,
            color: "var(--gray-meta)",
            fontSize: 13,
          }}
        >
          {project ? (
            <>
              <span>
                <strong style={{ color: "var(--ink)", fontWeight: 510 }}>
                  {project.inventory.fileCount}
                </strong>{" "}
                files measured
              </span>
              <span>
                <strong style={{ color: "var(--ink)", fontWeight: 510 }}>
                  {realFindings.length}
                </strong>{" "}
                findings, each with evidence
              </span>
            </>
          ) : (
            <>
              <span>
                <strong style={{ color: "var(--ink)", fontWeight: 510 }}>99.9</strong>{" "}
                uptime, 30 days
              </span>
              <span>
                <strong style={{ color: "var(--ink)", fontWeight: 510 }}>61st</strong>{" "}
                percentile, aviation training
              </span>
            </>
          )}
        </div>

        <div style={{ marginTop: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          {project ? (
            realUndecided.length > 0 ? (
              <button className="pill pill-dark" onClick={() => go("report")}>
                Decide {numberWordLower(realUndecided.length)} finding
                {realUndecided.length === 1 ? "" : "s"} in the report
                <Sparkle size={13} />
              </button>
            ) : (
              <>
                <div className="pulse-line">
                  <span>The plan is set. The report holds it.</span>
                </div>
                <button className="pill pill-dark" onClick={() => go("report")}>
                  Open the report
                  <Sparkle size={13} />
                </button>
              </>
            )
          ) : healableOpen.length > 0 || healing ? (
            /* what Heal will touch is shown first, never behind a link */
            <div
              className="card card-solid card-pad"
              style={{ maxWidth: 480, textAlign: "left", marginBottom: 90 }}
            >
              <div style={{ fontSize: 16.5, fontWeight: 550 }}>
                {numberWord(healableOpen.length)} issue
                {healableOpen.length === 1 ? "" : "s"} can heal{" "}
                {healableOpen.length === 1 ? "itself" : "themselves"}
              </div>
              <p style={{ fontSize: 13, color: "var(--gray-meta)", marginTop: 6 }}>
                Heal applies safe repairs itself. Everything is annotated,
                nothing is deleted, and the reveal shows each change.
              </p>
              <div className="receipt" style={{ maxWidth: "none" }}>
                {healables.map((i) => (
                  <div key={i.id} className="receipt-row">
                    <span className="pulse-dot" style={{ animation: "none", width: 6, height: 6 }} />
                    {i.title}
                    <span className="topbar-spacer" />
                    <span className="chip">{i.lens}</span>
                  </div>
                ))}
              </div>
              <button
                className="pill pill-dark"
                style={{ marginTop: 16 }}
                onClick={heal}
                disabled={healing}
              >
                {healing
                  ? "Healing"
                  : `Heal ${numberWordLower(healableOpen.length)} issue${healableOpen.length === 1 ? "" : "s"}`}
                <Sparkle size={13} />
              </button>
            </div>
          ) : !transformAccepted ? (
            <button className="pill pill-dark" onClick={() => go("transform")}>
              See what changed
              <Sparkle size={13} />
            </button>
          ) : keyStillBroken(healed) ? (
            <>
              <div className="pulse-line">
                <span>One thing waits on you: the weather key.</span>
              </div>
              <button className="pill pill-dark" onClick={() => go("findings")}>
                Open the Fix Prompt
                <Sparkle size={13} />
              </button>
            </>
          ) : (
            <>
              <div className="pulse-line">
                <span>Nothing needs you. The Art Director watches.</span>
              </div>
              <button className="pill" onClick={() => go("exam")}>
                See the report
              </button>
            </>
          )}
        </div>
      </div>
    </Page>
  );
}

function numberWord(n: number): string {
  const w = numberWordLower(n);
  return w.charAt(0).toUpperCase() + w.slice(1);
}

function numberWordLower(n: number): string {
  const words = ["zero", "one", "two", "three", "four", "five", "six"];
  return words[n] ?? String(n);
}
