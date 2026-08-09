import { useStore } from "../store";
import { Sparkle } from "../components/chrome";

/** The brand surface: near-black, the glow, the letterspaced wordmark. */
export function Landing() {
  const { go } = useStore();
  return (
    <div className="brand-surface">
      <div className="brand-glow" style={{ transform: "translateX(-190px)" }} />
      <div style={{ position: "relative", textAlign: "center" }}>
        <div className="brand-wordmark">OSYLE</div>
        <p className="brand-tagline">
          Drop your app. See everything it could be. Free.
        </p>
        <button className="brand-enter" onClick={() => go("drop")}>
          <Sparkle size={13} />
          Drop your app
        </button>
      </div>
      <div className="brand-foot">Where generated software lives</div>
    </div>
  );
}
