import { RegistryProvider } from "@effect/atom-react";
import { followColorScheme } from "@masseater.dev/ui/color-scheme";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { MarkingPage } from "#/pages/marking";

followColorScheme();

const root = document.querySelector("#root");

if (root !== null) {
  createRoot(root).render(
    <StrictMode>
      <RegistryProvider>
        <MarkingPage />
      </RegistryProvider>
    </StrictMode>,
  );
}
