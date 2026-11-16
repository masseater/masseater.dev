import { useAtom } from "@effect/atom-react";
import { Button } from "@masseater.dev/ui/button";
import { AsyncResult } from "effect/reactivity";
import { Check, Copy } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { copyAtom } from "#/features/connect-mcp/model/access";

const LABEL = "MCP";
const HINT = "Claude Code に追加するコマンドをコピー";

const iconOf = (done: boolean): ReactNode => {
  if (done) {
    return <Check aria-hidden="true" />;
  }
  return <Copy aria-hidden="true" />;
};

export const CopyMcpCommand = (): ReactNode => {
  const [copied, copy] = useAtom(copyAtom);
  const click = useCallback(() => {
    copy();
  }, [copy]);
  return (
    <Button variant="outline" title={HINT} onClick={click}>
      {iconOf(AsyncResult.isSuccess(copied))}
      {LABEL}
    </Button>
  );
};
