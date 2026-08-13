/**
 * Where the stack lives, decided once for the whole app.
 *
 * Until now the answer was hidden in two localStorage keys, which meant
 * the deployed site could never talk to a real stack: no visitor was
 * going to open a console and type them. The build names the stack
 * instead. `VITE_OSYLE_API` is baked in when the site is built against
 * a live api, and from then on the site simply uses it.
 *
 * The browser can still say otherwise, which is how a laptop points at
 * localhost while the same build points at the live one, and how anyone
 * can switch the stack off and watch the app keep working without it.
 * When nothing names a stack, there is no stack, and every surface says
 * so rather than guessing.
 */

const LOCAL = "http://localhost:8787";

/** Trailing slashes are a common paste; they would double in every URL. */
function tidy(base: string): string {
  return base.trim().replace(/\/+$/, "");
}

/**
 * The decision, with nothing around it. `builtIn` is what the build
 * baked in, `storedBase` and `storedMode` are what this browser says.
 * Kept separate from the reading so it can be reasoned about, and
 * tested, without a browser in the room.
 */
export function decideStack(
  builtIn: string,
  storedBase: string | null,
  storedMode: string | null,
): { on: boolean; base: string } {
  const baked = tidy(builtIn);
  const stored = storedBase ? tidy(storedBase) : "";
  const base = stored || baked || LOCAL;
  /* an explicit word in the browser wins both ways: "true" turns the
     stack on where the build named none, "false" turns it off where
     the build named one */
  if (storedMode === "true") return { on: true, base };
  if (storedMode === "false") return { on: false, base };
  return { on: Boolean(baked || stored), base };
}

const BAKED = (import.meta.env.VITE_OSYLE_API as string | undefined) ?? "";

/** The same decision, read from this browser. Never throws. */
export function stackHere(): { on: boolean; base: string } {
  try {
    return decideStack(
      BAKED,
      localStorage.getItem("osyle.apiBase"),
      localStorage.getItem("osyle.realMode"),
    );
  } catch {
    /* a browser with storage walled off still gets the built-in answer */
    return decideStack(BAKED, null, null);
  }
}

/** True when the build itself named a stack, so the switch is not a dev toy. */
export function stackIsNamedByBuild(): boolean {
  return Boolean(tidy(BAKED));
}
