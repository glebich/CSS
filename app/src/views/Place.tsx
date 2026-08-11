import { useRef, useState } from "react";
import { useStore } from "../store";
import { FlowSteps, Icon, Sparkle } from "../components/chrome";

/**
 * The place state: a real intake. Dropped files and zips are actually
 * parsed and measured by the engine; the example resident stands by,
 * clearly labeled, for anyone with nothing at hand.
 */
/* The cloud says only what the intake genuinely takes today. Nothing
   listed here is aspiration; each label is a working door. */
const PILLS: Array<{
  label: string;
  variant?: "selected" | "outline";
  style: React.CSSProperties;
}> = [
  { label: "Zip archive", variant: "outline", style: { left: "10%", top: "26%" } },
  { label: "App folder", variant: "selected", style: { left: "2%", top: "44%" } },
  { label: "Images", style: { left: "12%", top: "62%" } },
  { label: "HTML", style: { left: "31%", top: "26%" } },
  { label: "Styles", style: { left: "26%", top: "48%" } },
  { label: "JavaScript", style: { left: "27%", top: "62%" } },
  { label: "GitHub repo", variant: "selected", style: { right: "27%", top: "26%" } },
  { label: "Audio", style: { right: "29%", top: "48%" } },
  { label: "Readme", style: { right: "13%", top: "48%" } },
  { label: "Anything readable", variant: "outline", style: { right: "24%", top: "63%" } },
  { label: "React, Vue, Svelte", variant: "selected", style: { right: "3%", top: "63%" } },
];

/** Walk a dropped directory tree; browsers only reveal it entry by entry. */
async function walkEntry(
  entry: FileSystemEntry,
  prefix: string,
  out: Array<{ file: File; path: string }>,
): Promise<void> {
  if (out.length >= 60) return;
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) =>
      (entry as FileSystemFileEntry).file(resolve, reject),
    ).catch(() => null);
    if (file) out.push({ file, path: `${prefix}${entry.name}` });
    return;
  }
  if (entry.isDirectory) {
    if (/^(node_modules|\.git|dist|build|coverage)$/.test(entry.name)) return;
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    /* readEntries returns batches; keep reading until it runs dry */
    for (;;) {
      const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
        reader.readEntries(resolve, reject),
      ).catch(() => []);
      if (batch.length === 0) break;
      for (const child of batch) {
        await walkEntry(child, `${prefix}${entry.name}/`, out);
      }
    }
  }
}

export function Place() {
  const { beginUpload, analyzeFiles, analyzeRepo } = useStore();
  const [dragging, setDragging] = useState(false);
  const [repoText, setRepoText] = useState("");
  const [repoError, setRepoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const depth = useRef(0);

  const [reaching, setReaching] = useState(false);

  async function connectRepo() {
    if (!repoText.trim() || reaching) return;
    setRepoError(null);
    setReaching(true);
    const error = await analyzeRepo(repoText.trim());
    setReaching(false);
    if (error) setRepoError(error);
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    depth.current = 0;
    setDragging(false);
    /* folders arrive as entries, not files; walk them for real */
    const items = Array.from(e.dataTransfer.items ?? []);
    const entries = items
      .map((i) => i.webkitGetAsEntry?.())
      .filter((x): x is FileSystemEntry => x !== null && x !== undefined);
    if (entries.some((en) => en.isDirectory)) {
      const walked: Array<{ file: File; path: string }> = [];
      for (const entry of entries) await walkEntry(entry, "", walked);
      if (walked.length > 0) void analyzeFiles(walked);
      return;
    }
    const dropped = Array.from(e.dataTransfer.files ?? []);
    if (dropped.length > 0) void analyzeFiles(dropped);
  }

  return (
    <main
      className={`canvas${dragging ? " is-dragging" : ""}`}
      style={{ position: "relative", overflow: "hidden" }}
      onDragEnter={(e) => {
        e.preventDefault();
        depth.current += 1;
        setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        depth.current -= 1;
        if (depth.current <= 0) setDragging(false);
      }}
      onDrop={onDrop}
    >
      <FlowSteps current="place" />
      {PILLS.map((p, i) => (
        <span
          key={`${p.label}-${i}`}
          className={`type-pill place-decor${i % 2 === 1 ? " extra" : ""}${p.variant === "selected" ? " is-selected" : ""}${p.variant === "outline" ? " is-outline" : ""}`}
          style={{ position: "absolute", ...p.style }}
        >
          {p.label}
        </span>
      ))}
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          zIndex: 1,
          pointerEvents: "none",
        }}
      >
        <h1 className="statement statement-center">
          {dragging ? (
            <>
              Let
              <br />
              <span className="quiet">go</span>
            </>
          ) : (
            <>
              Place
              <br />
              something
              <br />
              <span className="quiet">here</span>
            </>
          )}
        </h1>
      </div>
      <div
        className="place-doors"
        style={{
          position: "absolute",
          bottom: 22,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          zIndex: 2,
        }}
      >
        {/* the repo door: name the repository, the examination follows */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="ask-pill" style={{ minWidth: 300, boxShadow: "var(--shadow-pill)" }}>
            <input
              placeholder="github.com/you/your-app"
              value={repoText}
              onChange={(e) => setRepoText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void connectRepo()}
            />
          </div>
          <button
            className="pill"
            onClick={() => void connectRepo()}
            title="GitHub serves the repository zip; Osyle reads it in your browser, nothing in between"
          >
            {reaching ? "Reaching the repository" : "Connect the repo"}
          </button>
        </div>
        {repoError && (
          <span className="fade-in" style={{ fontSize: 12.5, color: "var(--gray-meta)" }}>
            {repoError}
          </span>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input
          ref={fileRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            const chosen = Array.from(e.target.files ?? []);
            if (chosen.length > 0) void analyzeFiles(chosen);
          }}
        />
        <input
          ref={folderRef}
          type="file"
          {...({ webkitdirectory: "" } as Record<string, string>)}
          style={{ display: "none" }}
          onChange={(e) => {
            const chosen = Array.from(e.target.files ?? []);
            if (chosen.length > 0) void analyzeFiles(chosen);
          }}
        />
        <button className="pill pill-dark" onClick={() => folderRef.current?.click()}>
          Choose your app folder, or drop it anywhere
          <Sparkle size={13} />
        </button>
        {/* one door for loose files, wearing the clip rather than saying it */}
        <button
          className="circle"
          style={{ width: 48, height: 48 }}
          onClick={() => fileRef.current?.click()}
          title="Just files"
          aria-label="Just files"
        >
          <Icon name="clip" size={19} />
        </button>
        <button className="pill" onClick={() => beginUpload()}>
          See the example
        </button>
        </div>
      </div>
    </main>
  );
}
