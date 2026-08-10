import { useEffect } from "react";
import { StoreProvider, useStore } from "./store";
import { BottomBar, Icon, TopBar } from "./components/chrome";
import { MoodPanel, PersonasPanel, RunOverlay } from "./components/panels";
import { Landing } from "./views/Landing";
import { Place } from "./views/Place";
import { Assets } from "./views/Assets";
import { StyleExplore } from "./views/StyleExplore";
import { Launch } from "./views/Launch";
import { Home } from "./views/Home";
import { Examination } from "./views/Examination";
import { Findings } from "./views/Findings";
import { Report } from "./views/Report";
import { Transform } from "./views/Transform";
import { Reveal } from "./views/Reveal";
import { Issues } from "./views/Issues";
import { Address } from "./views/Address";
import { Monitor } from "./views/Monitor";
import { Inbox } from "./views/Inbox";
import { Sdk } from "./views/Sdk";
import { Promote } from "./views/Promote";
import { Audience } from "./views/Audience";
import { Studio } from "./views/Studio";

/** Views that belong to the flow before the resident lives. */
const FLOW_VIEWS = new Set(["place", "assets", "style", "launch"]);

function Screen() {
  const { view } = useStore();
  switch (view) {
    case "landing":
      return <Landing />;
    case "place":
      return <Place />;
    case "assets":
      return <Assets />;
    case "style":
      return <StyleExplore />;
    case "launch":
      return <Launch />;
    case "home":
      return <Home />;
    case "exam":
      return <Examination />;
    case "findings":
      return <Findings />;
    case "report":
      return <Report />;
    case "transform":
      return <Transform />;
    case "reveal":
      return <Reveal />;
    case "issues":
      return <Issues />;
    case "address":
      return <Address />;
    case "monitor":
      return <Monitor />;
    case "inbox":
      return <Inbox />;
    case "sdk":
      return <Sdk />;
    case "promote":
      return <Promote />;
    case "audience":
      return <Audience />;
    case "studio":
      return <Studio />;
  }
}

/** The browser tab is the quietest monitor: name, number, unread. */
function useLiveTitle() {
  const { view, vitality, inbox } = useStore();
  useEffect(() => {
    if (view === "landing" || FLOW_VIEWS.has(view)) {
      document.title = "Osyle";
      return;
    }
    const unread = inbox.filter((e) => !e.read).length;
    document.title = `Osyle, SkyRecall ${vitality}${unread > 0 ? `, ${unread} new` : ""}`;
  }, [view, vitality, inbox]);
}

function Shell() {
  const { view, panel, togglePanel, project } = useStore();
  useLiveTitle();
  if (view === "landing") return <Landing />;
  const inFlow = FLOW_VIEWS.has(view);
  const inResident = !inFlow;
  return (
    <div className="shell">
      <TopBar inResident={inResident} />
      <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <Screen />
        {inResident && <BottomBar />}
        {inResident && panel === "mood" && <MoodPanel />}
        {inResident && panel === "personas" && <PersonasPanel />}
        {inResident && !project && panel !== "run" && (
          <button className="run-pill" onClick={() => togglePanel("run")}>
            <Icon name="play" size={15} />
            RUN
          </button>
        )}
        {panel === "run" && <RunOverlay />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
