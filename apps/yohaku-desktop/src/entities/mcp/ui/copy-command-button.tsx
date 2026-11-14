import { Button } from "@masseater.dev/ui/button";
import { Effect } from "effect";
import { Copy } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import type { Mcp } from "#/shared/api";

const LABEL = "コマンドをコピー";

const commandFor = ({ url, token }: Mcp): string =>
  `claude mcp add --transport http yohaku ${url} --header "Authorization: Bearer ${token}"`;

const CopyCommandButton = ({ mcp }: Readonly<{ mcp: Mcp }>): ReactNode => {
  const onClick = useCallback(() => {
    Effect.runFork(Effect.promise(() => navigator.clipboard.writeText(commandFor(mcp))));
  }, [mcp]);
  return (
    <Button size="sm" variant="outline" onClick={onClick}>
      <Copy aria-hidden="true" />
      {LABEL}
    </Button>
  );
};

export { CopyCommandButton };
