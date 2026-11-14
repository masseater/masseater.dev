import { Option } from "effect";
import type { ReactNode } from "react";

import { useStepPending, useOnboardingDone } from "#/entities/onboarding";
import { OnboardingPage } from "#/pages/onboarding";

import { Pages } from "./pages.tsx";

const Screens = (): ReactNode => {
  const loaded = Option.isSome(useOnboardingDone());
  const setup = useStepPending("setup");
  if (!loaded) {
    return false;
  }
  if (setup) {
    return <OnboardingPage />;
  }
  return <Pages />;
};

export { Screens };
