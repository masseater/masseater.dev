import { Button } from "@masseater.dev/ui/button";
import { useMutation } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { revealServerLog } from "#/features/reveal-server-log/api/server-log";

const LABEL = "ログを表示";

const RevealLogButton = (): ReactNode => {
  const { mutate } = useMutation({ mutationFn: revealServerLog });
  const onClick = useCallback(() => {
    mutate();
  }, [mutate]);
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      <FileText />
      {LABEL}
    </Button>
  );
};

export { RevealLogButton };
