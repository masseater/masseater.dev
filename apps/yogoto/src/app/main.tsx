import { RegistryProvider } from "@effect/atom-react";
import { startScreenTelemetry } from "@masseater.dev/desktop-telemetry";
import { followColorScheme } from "@masseater.dev/ui/color-scheme";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { LibraryPage } from "#/pages/library/index.ts";

startScreenTelemetry("yogoto-screen");

followColorScheme();

const root = document.querySelector("#root");

if (root !== null) {
  createRoot(root).render(
    <StrictMode>
      <RegistryProvider>
        <LibraryPage />
      </RegistryProvider>
    </StrictMode>,
  );
}
