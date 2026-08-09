import { StoreProvider, useStore } from "./store";
import { BottomBar, TopBar } from "./components/chrome";
import { Landing } from "./views/Landing";
import { Drop } from "./views/Drop";
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

function Screen() {
  const { view } = useStore();
  switch (view) {
    case "landing":
      return <Landing />;
    case "drop":
      return <Drop />;
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
  const { view } = useStore();
  if (view === "landing") return <Landing />;
  const inResident = view !== "drop";
  return (
    <div className="shell">
      <TopBar inResident={inResident} />
      <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <Screen />
        {inResident && <BottomBar />}
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
