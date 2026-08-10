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
import { Transform } from "./views/Transform";
import { Reveal } from "./views/Reveal";
import { Issues } from "./views/Issues";
import { Address } from "./views/Address";
import { Monitor } from "./views/Monitor";
import { Inbox } from "./views/Inbox";
import { Sdk } from "./views/Sdk";
import { Promote } from "./views/Promote";

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
  }
}

function Shell() {
  const { view, panel, togglePanel } = useStore();
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
        {inResident && panel !== "run" && (
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
