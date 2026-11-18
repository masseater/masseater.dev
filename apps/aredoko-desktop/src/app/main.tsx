import { startScreenTelemetry } from "@masseater.dev/desktop-telemetry";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppShell } from "./shell/app-shell.tsx";
import { Providers } from "./shell/providers.tsx";

startScreenTelemetry("aredoko-desktop-screen");

const root = document.querySelector("#root");

if (root !== null) {
  createRoot(root).render(
    <StrictMode>
      <Providers>
        <AppShell />
      </Providers>
    </StrictMode>,
  );
}
