/**
 * The GitHub door: a person names their repository and Osyle reads the
 * app from it, client side, no server between. Public repositories
 * travel as the zipball GitHub itself serves; private ones need the
 * token flow that arrives with Real Mode, and the door says so.
 */

export interface RepoRef {
  owner: string;
  repo: string;
}

/** Accepts a full github.com URL or a bare owner/repo. Null when neither. */
export function parseRepoUrl(text: string): RepoRef | null {
  const cleaned = text.trim().replace(/\.git$/, "");
  const url = cleaned.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)/,
  );
  if (url) return { owner: url[1], repo: url[2] };
  const bare = cleaned.match(/^([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)$/);
  if (bare) return { owner: bare[1], repo: bare[2] };
  return null;
}

/**
 * Fetch the repository as the zip GitHub serves for its default
 * branch. Returns a File the existing intake already knows how to
 * read, or throws with a human sentence.
 */
export async function fetchRepoZip(ref: RepoRef, stackBase?: string): Promise<File> {
  /* the stack first, when it answers: GitHub's zip redirects through
     codeload, which refuses browsers, so the stack fetches it and
     hands the bytes over. The direct path stays as the fallback for
     setups where the redirect happens to pass. */
  if (stackBase) {
    try {
      const viaStack = await fetch(`${stackBase}/fetch/github/${ref.owner}/${ref.repo}`);
      if (viaStack.ok) {
        const bytes = await viaStack.arrayBuffer();
        return new File([bytes], `${ref.repo}.zip`, { type: "application/zip" });
      }
      if (viaStack.status === 404 || viaStack.status === 413 || viaStack.status === 429) {
        const body = (await viaStack.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `The stack answered ${viaStack.status}.`);
      }
      /* any other stack trouble falls through to the direct try */
    } catch (err) {
      if (err instanceof Error && !/fetch/i.test(err.message)) throw err;
    }
  }
  let res: Response;
  try {
    res = await fetch(`https://api.github.com/repos/${ref.owner}/${ref.repo}/zipball`, {
      headers: { Accept: "application/vnd.github+json" },
    });
  } catch {
    throw new Error(
      "GitHub's zip download refuses browsers without the stack. Start the local stack, or use Real Mode, and this door opens.",
    );
  }
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? `github.com/${ref.owner}/${ref.repo} is not reachable. Private repositories connect with Real Mode's token flow.`
        : `GitHub answered ${res.status}. Try again in a moment.`,
    );
  }
  const bytes = await res.arrayBuffer();
  return new File([bytes], `${ref.repo}.zip`, { type: "application/zip" });
}
