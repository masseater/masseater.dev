import { Button } from "@masseater.dev/ui/button";
import type { Source } from "@masseater.dev/yohaku-protocol";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { useRevert } from "#/entities/source/api/sources.ts";

const LABEL = "戻す";

const RevertButton = ({ source }: Readonly<{ source: typeof Source.Type }>): ReactNode => {
  const revert = useRevert();
  const onClick = useCallback(() => {
    revert(source.id);
  }, [revert, source.id]);
  if (source.origin === "manuscript") {
    return false;
  }
  return (
    <Button data-revert={source.id} size="sm" variant="outline" onClick={onClick}>
      {LABEL}
    </Button>
  );
};

export { RevertButton };
