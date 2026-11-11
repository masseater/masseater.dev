import { Button } from "@masseater.dev/ui/button";
import { Square } from "lucide-react";
import type { ReactNode } from "react";

import { useEnd } from "#/pages/interview/model/hooks";

const LABEL = "終える";

const EndButton = (): ReactNode => {
  const onClick = useEnd();
  return (
    <Button variant="ghost" size="sm" onClick={onClick}>
      <Square className="fill-current" />
      {LABEL}
    </Button>
  );
};

export { EndButton };
