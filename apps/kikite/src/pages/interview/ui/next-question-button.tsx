import { Button } from "@masseater.dev/ui/button";
import { SkipForward } from "lucide-react";
import type { ReactNode } from "react";

import { useWithSession } from "#/pages/interview/model/hooks";
import type { Session } from "#/pages/interview/model/hooks";

const LABEL = "次を聞く";

const askNext = (session: Session): void => {
  session.ask();
};

const NextQuestionButton = (): ReactNode => {
  const onClick = useWithSession(askNext);
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      <SkipForward />
      {LABEL}
    </Button>
  );
};

export { NextQuestionButton };
