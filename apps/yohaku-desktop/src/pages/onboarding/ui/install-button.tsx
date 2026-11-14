import { Button } from "@masseater.dev/ui/button";
import { Effect } from "effect";
import { ExternalLink } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { useYohaku } from "#/shared/api";

const GUIDE = "https://code.claude.com/docs/ja/quickstart";
const LABEL = "Claude Code を入れる";

const InstallButton = (): ReactNode => {
  const yohaku = useYohaku();
  const onClick = useCallback(() => {
    Effect.runFork(yohaku.openExternal(GUIDE));
  }, [yohaku]);
  return (
    <Button size="sm" onClick={onClick}>
      <ExternalLink aria-hidden="true" />
      {LABEL}
    </Button>
  );
};

export { InstallButton };
