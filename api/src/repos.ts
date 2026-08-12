/**
 * The repository door, server side. Browsers cannot download GitHub's
 * zipball directly: the API redirects to codeload, and codeload does
 * not speak CORS. The stack fetches it instead and hands the bytes
 * over, capped and rate limited, so the door opens without a token
 * for any public repository.
 */
import type { FastifyInstance } from "fastify";
import { allow, walled } from "./limits.js";

const MAX_ZIP_BYTES = Number(process.env.OSYLE_REPO_ZIP_BYTES ?? 15 * 1024 * 1024);
/* owners are letters, digits, hyphens on GitHub; repo names may add
   dots and underscores, but never dots alone, so `..` cannot pass */
const OWNER_RE = /^[A-Za-z0-9-]{1,100}$/;
const NAME_RE = /^(?!\.+$)[A-Za-z0-9._-]{1,100}$/;

export function registerRepos(app: FastifyInstance): void {
  app.get<{ Params: { owner: string; repo: string } }>(
    "/fetch/github/:owner/:repo",
    async (req, reply) => {
      const { owner, repo } = req.params;
      if (!OWNER_RE.test(owner) || !NAME_RE.test(repo)) {
        return reply.code(400).send({ error: "name it like owner/repo" });
      }
      const verdict = allow("repo.fetch", req.ip, 10, 60 * 60_000);
      if (!verdict.ok) return walled(reply, verdict);
      let res: Response;
      try {
        res = await fetch(`https://api.github.com/repos/${owner}/${repo}/zipball`, {
          headers: { Accept: "application/vnd.github+json", "User-Agent": "osyle-stack" },
          redirect: "follow",
        });
      } catch {
        return reply.code(502).send({ error: "GitHub did not answer from here" });
      }
      if (!res.ok) {
        return reply.code(res.status === 404 ? 404 : 502).send({
          error:
            res.status === 404
              ? `github.com/${owner}/${repo} is not reachable. Private repositories connect with Real Mode's token flow.`
              : `GitHub answered ${res.status}. Try again in a moment.`,
        });
      }
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.length > MAX_ZIP_BYTES) {
        return reply.code(413).send({
          error: `the repository zip is larger than the door allows (${Math.round(MAX_ZIP_BYTES / (1024 * 1024))} MB)`,
        });
      }
      return reply.type("application/zip").send(bytes);
    },
  );
}
