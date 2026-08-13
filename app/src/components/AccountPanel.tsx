import { useCallback, useEffect, useState } from "react";
import { useStore } from "../store";
import { Sparkle } from "./chrome";

interface Me {
  id: string;
  email: string;
}

interface Resident {
  slug: string;
  name: string;
  createdAt: string;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="section-label" style={{ marginTop: 22 }}>
      {children}
    </div>
  );
}

/**
 * The door for coming back. Everything a person makes here lives in
 * this browser until they sign in; from then on the stack holds the
 * apps and a letter opens them from any machine. When there is no
 * stack, or no way to post a letter, the panel says which and stops
 * rather than pretending an account exists.
 */
export function AccountPanel() {
  const { stack, togglePanel } = useStore();
  const [me, setMe] = useState<Me | null>(null);
  const [asked, setAsked] = useState(false);
  const [mine, setMine] = useState<Resident[] | null>(null);
  const [email, setEmail] = useState("");
  const [word, setWord] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const live = stack.on && stack.up === true;

  const readMe = useCallback(() => {
    if (!live) {
      setAsked(true);
      return;
    }
    fetch(`${stack.base}/auth/me`, { credentials: "include" })
      .then((r) => (r.ok ? (r.json() as Promise<{ user: Me | null }>) : null))
      .then((b) => setMe(b?.user ?? null))
      .catch(() => setMe(null))
      .finally(() => setAsked(true));
  }, [live, stack.base]);

  useEffect(() => readMe(), [readMe]);

  useEffect(() => {
    if (!me || !live) return;
    fetch(`${stack.base}/residents`, { credentials: "include" })
      .then((r) => (r.ok ? (r.json() as Promise<{ residents: Resident[] }>) : null))
      .then((b) => setMine(b?.residents ?? []))
      .catch(() => setMine([]));
  }, [me, live, stack.base]);

  const askForALink = () => {
    const to = email.trim().toLowerCase();
    if (!to.includes("@")) {
      setWord("A real email address, so the letter has somewhere to go.");
      return;
    }
    setWorking(true);
    setWord(null);
    setDevLink(null);
    fetch(`${stack.base}/auth/link`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: to }),
    })
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as {
          sent?: boolean;
          devLink?: string;
          note?: string;
          error?: string;
        } | null;
        if (res.status === 429) {
          setWord("That is a lot of letters. Try again in a few minutes.");
          return;
        }
        if (body?.sent) {
          setWord(`The letter is on its way to ${to}. It opens once, within fifteen minutes.`);
          return;
        }
        /* a stack with no mailer hands the link back; the door offers
           it rather than leaving a person waiting on nothing */
        if (body?.devLink) {
          setDevLink(`${stack.base}${body.devLink}`);
          setWord(body.note ?? "This stack cannot post letters, so the way in is here.");
          return;
        }
        setWord(body?.error ?? `The stack answered ${res.status}.`);
      })
      .catch(() => setWord("The stack did not answer."))
      .finally(() => setWorking(false));
  };

  const leave = () => {
    fetch(`${stack.base}/auth/signout`, { method: "POST", credentials: "include" })
      .then(() => {
        setMe(null);
        setMine(null);
        setWord("Signed out on this machine. Your apps wait on the stack.");
      })
      .catch(() => setWord("The stack did not answer."));
  };

  return (
    <>
      <div className="resident-backdrop" onClick={() => togglePanel("account")} />
      <aside className="resident-panel glass-panel" aria-label="Your account">
        <button
          className="panel-x"
          onClick={() => togglePanel("account")}
          aria-label="Close the panel"
        >
          <svg width="10" height="10" viewBox="0 0 8 8" fill="none" aria-hidden>
            <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>

        <div className="panel-title" style={{ marginBottom: 4 }}>
          {me ? "Your account" : "Come back to your apps"}
        </div>
        <p style={{ fontSize: 12.5, color: "var(--gray-small)", marginTop: 8 }}>
          {me
            ? me.email
            : "Everything you make here lives in this browser. Sign in and the stack keeps it, so any machine opens it."}
        </p>

        {!live ? (
          <p style={{ fontSize: 12.5, color: "var(--gray-small)", marginTop: 18 }}>
            Accounts live on the stack, and no stack is answering from here.
            Start it locally, or wait for the hosted one; nothing you have
            made is lost either way, it is held in this browser.
          </p>
        ) : !asked ? (
          <p style={{ fontSize: 12.5, color: "var(--gray-small)", marginTop: 18 }}>Asking the stack.</p>
        ) : me ? (
          <>
            <SectionLabel>The apps you hold</SectionLabel>
            {mine === null ? (
              <p style={{ fontSize: 12.5, color: "var(--gray-small)" }}>Reading them.</p>
            ) : mine.length === 0 ? (
              <p style={{ fontSize: 12.5, color: "var(--gray-small)" }}>
                None yet on the stack. Claim an app from its address and it
                will be here on every machine you sign in from.
              </p>
            ) : (
              <div style={{ display: "grid", gap: 2 }}>
                {mine.map((r) => (
                  <div key={r.slug} className="inbox-item">
                    <span className="inbox-dot read" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14 }}>{r.name}</div>
                      <div style={{ fontSize: 12, color: "var(--gray-meta)", marginTop: 2 }}>
                        {r.slug}.osyle.app, since {r.createdAt.slice(0, 10)}
                      </div>
                    </div>
                    <a
                      className="pill pill-sm"
                      href={`#/r/${r.slug}`}
                      style={{ textDecoration: "none" }}
                    >
                      Visit
                    </a>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button className="pill pill-sm" onClick={leave}>
                Sign out
              </button>
            </div>
          </>
        ) : (
          <>
            <SectionLabel>Sign in</SectionLabel>
            <div style={{ display: "grid", gap: 10 }}>
              <div className="ask-pill" style={{ minWidth: 0, height: 44 }}>
                <input
                  placeholder="you@yourdomain.com"
                  value={email}
                  aria-label="Your email"
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && askForALink()}
                />
              </div>
              <button
                className="pill pill-dark"
                style={{ justifySelf: "start" }}
                disabled={working}
                onClick={askForALink}
              >
                {working ? "Asking" : "Send me a way in"}
                <Sparkle size={13} />
              </button>
              <p style={{ fontSize: 12, color: "var(--gray-small)" }}>
                No password, ever. One letter, one link, fifteen minutes.
              </p>
            </div>
          </>
        )}

        {word && (
          <p className="fade-in" style={{ fontSize: 12.5, color: "var(--gray-small)", marginTop: 14 }}>
            {word}
          </p>
        )}
        {devLink && (
          <a
            className="pill pill-sm fade-in"
            href={devLink}
            style={{ textDecoration: "none", marginTop: 10, display: "inline-block" }}
          >
            Open the way in
          </a>
        )}
      </aside>
    </>
  );
}
