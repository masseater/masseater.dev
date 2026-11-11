import { followColorScheme } from "@masseater.dev/ui/color-scheme";
import { QueryClient } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { TranslatorPage } from "#/pages/translator";
import { tauriEngine } from "#/shared/api";

import { Providers } from "./state.tsx";

followColorScheme();

const root = document.querySelector("#root");

if (root !== null) {
  createRoot(root).render(
    <StrictMode>
      <Providers client={new QueryClient()} engine={tauriEngine}>
        <TranslatorPage />
      </Providers>
    </StrictMode>,
  );
}
