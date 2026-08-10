import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  /* relative asset paths so the same build serves at /, at /CSS/ on
     GitHub Pages, and inside the single-file bundle */
  base: "./",
});
