/**
 * The mailer. Magic links have always been minted and stored; without
 * a way to send them, a person could only ever claim an app in the
 * same browser session that made it. This is the piece that lets
 * someone come back tomorrow, on another machine, and find their work.
 *
 * The key never lives in the repository. It arrives as
 * OSYLE_RESEND_KEY, and when it is absent the api says so plainly and
 * hands the link back in dev instead of pretending to have posted it.
 */
const KEY = process.env.OSYLE_RESEND_KEY ?? "";
const FROM = process.env.OSYLE_MAIL_FROM ?? "Osyle <hello@osyle.xyz>";
const SEND_URL = "https://api.resend.com/emails";

/** Whether the stack can actually put a letter in the post. */
export function mailReady(): boolean {
  return KEY.length > 0;
}

function letter(link: string): { subject: string; text: string; html: string } {
  const subject = "Your way back into Osyle";
  const text = [
    "Here is your way in. The link opens your apps and everything you",
    "decided about them.",
    "",
    link,
    "",
    "It works once, and only for the next fifteen minutes. If you did",
    "not ask for it, nothing has happened and you can ignore this.",
  ].join("\n");
  const html = `<div style="font-family: -apple-system, system-ui, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1e">
<p>Here is your way in. The link opens your apps and everything you decided about them.</p>
<p><a href="${link}" style="display: inline-block; padding: 12px 22px; border-radius: 999px; background: #0c0c0e; color: #fff; text-decoration: none">Open Osyle</a></p>
<p style="color: #6b6b73; font-size: 13px">It works once, and only for the next fifteen minutes. If you did not ask for it, nothing has happened and you can ignore this.</p>
</div>`;
  return { subject, text, html };
}

/**
 * Post the link. Returns null when it went, or one honest sentence
 * when it did not, so the door above can tell the truth either way.
 */
export async function sendMagicLink(to: string, link: string): Promise<string | null> {
  if (!mailReady()) return "no mail provider is configured on this stack";
  const { subject, text, html } = letter(link);
  try {
    const res = await fetch(SEND_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, text, html }),
    });
    if (res.ok) return null;
    const body = await res.text().catch(() => "");
    /* the provider's own words, trimmed, never the key */
    return `the mail provider answered ${res.status}${body ? `: ${body.slice(0, 160)}` : ""}`;
  } catch {
    return "the mail provider could not be reached from this stack";
  }
}
