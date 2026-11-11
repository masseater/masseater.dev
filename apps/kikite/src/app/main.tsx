import { RegistryProvider } from "@effect/atom-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { InterviewPage } from "#/pages/interview";

const root = document.querySelector("#root");

if (root !== null) {
  createRoot(root).render(
    <StrictMode>
      <RegistryProvider>
        <InterviewPage />
      </RegistryProvider>
    </StrictMode>,
  );
}
