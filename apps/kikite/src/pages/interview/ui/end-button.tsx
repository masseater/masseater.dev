import { Button } from "@masseater.dev/ui/button";
import type { ReactNode } from "react";

import { useWrapUp } from "#/pages/interview/model/session-hooks";

const LABEL = "切り上げる";

const EndButton = (): ReactNode => {
  const onClick = useWrapUp();
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      {LABEL}
    </Button>
  );
};

export { EndButton };
