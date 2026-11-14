import { Button } from "@masseater.dev/ui/button";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { useCompleteStep } from "#/entities/onboarding";

const LABEL = "書き始める";

const StartButton = (): ReactNode => {
  const complete = useCompleteStep();
  const onClick = useCallback(() => {
    complete("setup");
  }, [complete]);
  return (
    <div className="flex justify-end">
      <Button onClick={onClick}>{LABEL}</Button>
    </div>
  );
};

export { StartButton };
