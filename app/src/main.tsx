import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ResidentApp } from "./resident/ResidentApp";
import { OwnerConsole } from "./owner/OwnerConsole";
import "./styles.css";

function residentSlug(): string | null {
  return window.location.hash.match(/^#\/r\/([a-z][a-z0-9-]*)/)?.[1] ?? null;
}

function isOwner(): boolean {
  return /^#\/owner/.test(window.location.hash);
}

/* The address is real: #/r/{slug} serves the resident itself, #/owner
   opens the operator's room, and the doors work in both directions. */
function Root() {
  const [route, setRoute] = useState(() => ({ slug: residentSlug(), owner: isOwner() }));
  useEffect(() => {
    const onHash = () => setRoute({ slug: residentSlug(), owner: isOwner() });
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  if (route.owner) return <OwnerConsole />;
  return route.slug ? <ResidentApp key={route.slug} slug={route.slug} /> : <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
