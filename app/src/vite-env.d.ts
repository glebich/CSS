/// <reference types="vite/client" />

/** What the build is allowed to bake into the browser bundle. */
interface ImportMetaEnv {
  /** The live api's origin, or absent when this build knows no stack. */
  readonly VITE_OSYLE_API?: string;
  /** The word that opens the real-drop path; a default stands in. */
  readonly VITE_OSYLE_GATE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
