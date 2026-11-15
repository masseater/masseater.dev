import { Option } from "effect";
import type { ReactNode } from "react";

import { useStepPending, useOnboardingDone } from "#/entities/onboarding";
import { UpdateNotice } from "#/features/update";
import { OnboardingPage } from "#/pages/onboarding";

import { Pages } from "./pages.tsx";
import { useShownOnceReady } from "./window.ts";

const Screens = (): ReactNode => {
  const loaded = Option.isSome(useOnboardingDone());
  const setup = useStepPending("setup");
  useShownOnceReady(loaded);
  if (!loaded) {
    return false;
  }
  if (setup) {
    return <OnboardingPage />;
  }
  return (
    <>
      <Pages />
      <UpdateNotice />
    </>
  );
};

export { Screens };
