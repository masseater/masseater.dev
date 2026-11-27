import { browserTest } from "@masseater.dev/browser-test/vite";
import { defineConfig } from "vite-plus";

const PREBUNDLED = [
  "@effect/atom-react",
  "@remotion/media-utils",
  "@remotion/player",
  "ag-psd",
  "effect/http",
  "effect/reactivity",
  "react",
  "react-dom/client",
  "react/jsx-dev-runtime",
  "remotion",
];

export default defineConfig({
  ...browserTest({ width: 800, height: 800 }),
  optimizeDeps: { include: PREBUNDLED },
});
