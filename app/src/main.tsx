import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ResidentApp } from "./resident/ResidentApp";
import { OwnerConsole } from "./owner/OwnerConsole";
import { Hallmark } from "./owner/Hallmark";
import { Discover } from "./discover/Discover";
import "./styles.css";

function residentSlug(): string | null {
  return window.location.hash.match(/^#\/r\/([a-z][a-z0-9-]*)/)?.[1] ?? null;
}

function markSlug(): string | null {
  return window.location.hash.match(/^#\/mark\/([a-z][a-z0-9-]*)/)?.[1] ?? null;
}

function isOwner(): boolean {
  return /^#\/owner/.test(window.location.hash);
}

function isDiscover(): boolean {
  return /^#\/discover/.test(window.location.hash);
}

/* The address is real: #/r/{slug} serves the resident itself, #/owner
   opens the operator's room, #/mark/{slug} shows the live Hallmark,
   and every door works in both directions. */
function Root() {
  const [route, setRoute] = useState(() => ({
    slug: residentSlug(),
    mark: markSlug(),
    owner: isOwner(),
    discover: isDiscover(),
  }));
  useEffect(() => {
    const onHash = () =>
      setRoute({
        slug: residentSlug(),
        mark: markSlug(),
        owner: isOwner(),
        discover: isDiscover(),
      });
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  if (route.owner) return <OwnerConsole />;
  if (route.discover) return <Discover />;
  if (route.mark) return <Hallmark key={route.mark} slug={route.mark} />;
  return route.slug ? <ResidentApp key={route.slug} slug={route.slug} /> : <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
