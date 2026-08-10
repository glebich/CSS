import { useStore } from "../store";
import { Page, Sparkle } from "../components/chrome";
import { artDirector } from "../data/seed";

/** The Inbox: the one quiet stream. Everything arrives as human sentences,
    and the Art Director's composed notes arrive here too, signed. */
export function Inbox() {
  const { inbox, markRead, go } = useStore();
  const unread = inbox.filter((e) => !e.read);

  return (
    <Page>
      <h1 className="statement statement-page">
        One quiet <span className="quiet">stream.</span>
      </h1>
      <p style={{ color: "var(--gray-meta)", marginTop: 6 }}>
        Everything that matters arrives here as a sentence. Silence when there
        is nothing worth saying.
      </p>

      <div className="card" style={{ padding: "6px 24px", marginTop: 30 }}>
        {inbox.map((entry) => (
          <div
            key={entry.id}
            className="inbox-item"
            role="button"
            tabIndex={0}
            style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
            onClick={() => markRead(entry.id)}
            onKeyDown={(e) => e.key === "Enter" && markRead(entry.id)}
          >
            <span className={`inbox-dot${entry.read ? " read" : ""}`} />
            <div style={{ flex: 1 }}>
              {entry.director && (
                <div style={{ fontSize: 11.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--gray-small)", marginBottom: 4 }}>
                  {artDirector.name}, {artDirector.title}
                </div>
              )}
              <div style={{ fontSize: 14.5, color: entry.read ? "var(--gray-meta)" : "var(--ink)" }}>
                {entry.text}
              </div>
              {entry.director?.quote && (
                <div
                  style={{
                    fontStyle: "italic",
                    fontSize: 15.5,
                    color: "var(--ink-body)",
                    borderLeft: "2px solid var(--hairline)",
                    paddingLeft: 12,
                    margin: "10px 0 2px",
                    maxWidth: 560,
                  }}
                >
                  {entry.director.quote}
                </div>
              )}
              {entry.director && (
                <div style={{ fontSize: 12, color: "var(--gray-small)", marginTop: 6 }}>
                  Evidence: {entry.director.evidence}
                </div>
              )}
              <div style={{ fontSize: 12, color: "var(--gray-meta)", marginTop: 3 }}>
                {entry.when}
              </div>
              {entry.director?.action && (
                <button
                  className="pill pill-sm"
                  style={{ marginTop: 8 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    markRead(entry.id);
                    go(entry.director!.action!.view as Parameters<typeof go>[0]);
                  }}
                >
                  {entry.director.action.label}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 34 }}>
        {unread.length > 0 ? (
          <button
            className="pill pill-dark"
            onClick={() => unread.forEach((e) => markRead(e.id))}
          >
            Mark all read
            <Sparkle size={13} />
          </button>
        ) : (
          <button className="pill pill-dark" onClick={() => go("home")}>
            All caught up. Back to the work
            <Sparkle size={13} />
          </button>
        )}
      </div>
    </Page>
  );
}
