import type { ReactNode } from "react";

import { ClaudeStep } from "./claude-step.tsx";
import { SettingStep } from "./setting-step.tsx";
import { StartButton } from "./start-button.tsx";

const TITLE = "余白";

const OnboardingPage = (): ReactNode => (
  <main className="mx-auto flex h-screen max-w-3xl flex-col gap-8 overflow-y-auto px-10 py-16">
    <h1 className="font-serif text-2xl">{TITLE}</h1>
    <ClaudeStep />
    <SettingStep />
    <StartButton />
  </main>
);

export { OnboardingPage };
