import { hints } from "driver.js/hints";
import { Function, Option } from "effect";
import { useEffect } from "react";

import type { OnboardingStep } from "#/shared/api";

import { useCompleteStep, useStepPending } from "./onboarding.ts";

type Hint = Readonly<{
  step: OnboardingStep;
  find: () => Option.Option<Element>;
  title: string;
  description: string;
}>;

const POPOVER_CLASS = "yohaku-hint";
const BUTTON = "わかった";

const useHint = ({ step, find, title, description }: Hint): void => {
  const pending = useStepPending(step);
  const complete = useCompleteStep();
  useEffect(() => {
    if (!pending) {
      return Function.constVoid;
    }
    const finish = (): void => {
      complete(step);
    };
    const shown = hints({
      popoverClass: POPOVER_CLASS,
      beacon: { side: "left", align: "center" },
      buttonText: BUTTON,
      onButtonClick: finish,
      onDismiss: finish,
    });
    const place = (): boolean => {
      const element = find();
      if (Option.isNone(element)) {
        return false;
      }
      shown.setHints([{ id: step, element: element.value, popover: { title, description } }]);
      shown.show();
      return true;
    };
    const watcher = new MutationObserver(() => {
      if (place()) {
        watcher.disconnect();
      }
    });
    if (!place()) {
      watcher.observe(document.body, { childList: true, subtree: true });
    }
    return (): void => {
      watcher.disconnect();
      shown.hide();
    };
  }, [pending, complete, step, find, title, description]);
};

export { useHint };
export type { Hint };
