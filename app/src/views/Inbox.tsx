import { useStore } from "../store";
import { Page, Sparkle } from "../components/chrome";

/** The Inbox: the one quiet stream. Everything arrives as human sentences. */
export function Inbox() {
  const { inbox, markRead } = useStore();
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
          <button
            key={entry.id}
            className="inbox-item"
            style={{ width: "100%", textAlign: "left" }}
            onClick={() => markRead(entry.id)}
          >
            <span className={`inbox-dot${entry.read ? " read" : ""}`} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5, color: entry.read ? "var(--gray-meta)" : "var(--ink)" }}>
                {entry.text}
              </div>
              <div style={{ fontSize: 12, color: "var(--gray-meta)", marginTop: 3 }}>
                {entry.when}
              </div>
            </div>
          </button>
        ))}
      </div>

      {unread.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 34 }}>
          <button
            className="pill pill-dark"
            onClick={() => unread.forEach((e) => markRead(e.id))}
          >
            Mark all read
            <Sparkle size={13} />
          </button>
        </div>
      )}
    </Page>
  );
}
