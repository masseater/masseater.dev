import { Option } from "effect";
import type { ReactNode } from "react";

import { useStepPending, useOnboardingDone } from "#/entities/onboarding/index.ts";
import { UpdateNotice } from "#/features/update/index.ts";
import { OnboardingPage } from "#/pages/onboarding/index.ts";

import { Pages } from "./pages.tsx";
import { useResumed } from "./resume.ts";
import { useShownOnceReady } from "./window.ts";

export const Screens = (): ReactNode => {
  const loaded = Option.isSome(useOnboardingDone());
  const setup = useStepPending("setup");
  const resumed = useResumed();
  const ready = loaded && (setup || resumed);
  useShownOnceReady(ready);
  if (!ready) {
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
