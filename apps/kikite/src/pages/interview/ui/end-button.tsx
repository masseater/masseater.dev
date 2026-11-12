import { Button } from "@masseater.dev/ui/button";
import type { ReactNode } from "react";

import { useEnd } from "#/pages/interview/model/hooks";

const LABEL = "終える";

const EndButton = (): ReactNode => {
  const onClick = useEnd();
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      {LABEL}
    </Button>
  );
};

export { EndButton };
