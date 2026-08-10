import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ResidentApp } from "./resident/ResidentApp";
import "./styles.css";

function residentSlug(): string | null {
  return window.location.hash.match(/^#\/r\/([a-z][a-z0-9-]*)/)?.[1] ?? null;
}

/* The address is real: #/r/{slug} serves the resident itself, and the
   door works in both directions, new tab or same tab. */
function Root() {
  const [slug, setSlug] = useState(residentSlug);
  useEffect(() => {
    const onHash = () => setSlug(residentSlug());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return slug ? <ResidentApp key={slug} slug={slug} /> : <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
