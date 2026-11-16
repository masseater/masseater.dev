import { Button } from "@masseater.dev/ui/button";
import { Mic } from "lucide-react";
import type { ReactNode } from "react";

import { useRestart } from "#/pages/report/model/review-hooks.ts";

const LABEL = "新しく聞く";

export const RestartButton = (): ReactNode => {
  const onClick = useRestart();
  return (
    <Button size="sm" onClick={onClick}>
      <Mic />
      {LABEL}
    </Button>
  );
};
