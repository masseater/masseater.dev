import { QueryClient } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { TranslatorPage } from "#/pages/translator";
import { tauriEngine } from "#/shared/api";

import { followColorScheme } from "./color-scheme.ts";
import { Providers } from "./providers.tsx";

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
