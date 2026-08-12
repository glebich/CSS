import { useEffect, useRef, useState } from "react";
import { currentState, useStore } from "../store";
import { Icon, InstrumentBurst, Page, Sparkle } from "../components/chrome";
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

  /* the receipt of healed work stays on the surface; leaving the room
     and coming back never erases what was done */
  const healReceipt =
    !project && healedSomething && !healing && healableOpen.length === 0 ? (
      <div style={{ textAlign: "left", width: "100%" }}>
        <div style={{ fontSize: 15, fontWeight: 550 }}>What Heal changed</div>
        <div className="receipt" style={{ maxWidth: "none" }}>
          {issues
            .filter((i) => healed.has(i.id))
            .map((i) => (
              <div key={i.id} className="receipt-row">
                <Icon name="check" size={12} />
                {i.title}
                <span className="topbar-spacer" />
                <span className="chip">{i.lens}</span>
              </div>
            ))}
        </div>
      </div>
    ) : null;
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

      <div className="home-wrap" style={{ paddingTop: returned ? 0 : 12 }}>
        {/* the header rail: the claim on the left, the address on the right */}
        <div className="home-head">
        <h1 className="statement home-statement">
          It lives <span className="quiet">here now.</span>
        </h1>
        <div
          className="card card-solid"
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span className="pulse-dot" />
          <span style={{ fontWeight: 550, fontSize: 14 }}>
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
              {/* the plain edit door: name, domain, files, one panel */}
              <button
                className="circle"
                style={{ width: 32, height: 32 }}
                onClick={() => togglePanel("resident")}
                title="Edit the app, its name, domain, and files"
                aria-label="Edit the app"
              >
                <Icon name="edit" size={13} />
              </button>
            </>
          ) : (
            <button className="pill pill-sm" onClick={() => go("report")}>
              Give it the address, at the end of the report
            </button>
          )}
        </div>
        </div>

        <div className="home-grid">
        <section className="card card-pad home-cell home-cell-score">
        <span className="instrument-label">
          Vitality
        </span>
        <InstrumentBurst
          score={shown}
          size={288}
          onClick={() => go(project ? "report" : "exam")}
          title={project ? "See the report" : "See the ten lenses"}
        />
        <span
          style={{ fontSize: 12, color: "var(--gray-small)" }}
          title="Vitality is your app's health, 0 to 100, weighed across ten lenses at the last examination."
        >
          Your app's health, 0 to 100. Tap the number for the why.
        </span>

        <div className="pulse-line" style={{ marginTop: 6 }}>
          <span className={`pulse-dot${healedSomething ? " swell" : ""}`} />
          <span>{pulseLine}</span>
        </div>

        </section>
        <div className="home-cell home-cell-act">
        {/* the watch: the numbers and the note, one card */}
        <section className="card card-pad home-watch">
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
            marginTop: 6,
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
                <strong style={{ color: "var(--ink)", fontWeight: 510 }}>9</strong>{" "}
                sessions today
              </span>
              <span>
                <strong style={{ color: "var(--ink)", fontWeight: 510 }}>61st</strong>{" "}
                percentile, aviation training
              </span>
            </>
          )}
        </div>

        {/* the rooms this number lives in, one step away */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <button className="pill pill-sm" onClick={() => go("monitor")}>
            Watch the traffic
          </button>
          <button className="pill pill-sm" onClick={() => go("sdk")}>
            The journeys
          </button>
          <button className="pill pill-sm" onClick={() => go("inbox")}>
            Inbox{unread > 0 ? `, ${unread} new` : ""}
          </button>
        </div>

        </section>
        <section className="card card-pad home-act">
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
            <div style={{ textAlign: "left" }}>
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
            <>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="pill pill-dark" onClick={() => go("transform")}>
                  See what changed
                  <Sparkle size={13} />
                </button>
                <button className="pill" onClick={() => go("promote")}>
                  Promote it
                </button>
              </div>
              {healReceipt}
            </>
          ) : keyStillBroken(healed) ? (
            <>
              <div className="pulse-line">
                <span>One thing waits on you: the weather key.</span>
              </div>
              <button className="pill pill-dark" onClick={() => go("findings")}>
                Open the Fix Prompt
                <Sparkle size={13} />
              </button>
              {healReceipt}
            </>
          ) : (
            <>
              <div className="pulse-line">
                <span>Nothing needs you. The Art Director watches.</span>
              </div>
              <button className="pill" onClick={() => go("exam")}>
                See the report
              </button>
              {healReceipt}
            </>
          )}
        </section>
        </div>
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
