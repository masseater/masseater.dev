import { useAtom } from "@effect/atom-react";
import { Button } from "@masseater.dev/ui/button";
import { AsyncResult } from "effect/reactivity";
import { Check, Copy } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { copyAtom } from "#/features/connect-mcp/model/access.ts";

const LABEL = "MCP";
const HINT = "Claude Code に追加するコマンドをコピー";
const COPIED = "コピーしました";
const FAILED = "コピーできませんでした";
const SILENT = "";

const iconOf = (done: boolean): ReactNode => {
  if (done) {
    return <Check aria-hidden="true" />;
  }
  return <Copy aria-hidden="true" />;
};

const statusOf = (done: boolean, failed: boolean): string => {
  if (done) {
    return COPIED;
  }
  if (failed) {
    return FAILED;
  }
  return SILENT;
};

export const CopyMcpCommand = ({ name }: Readonly<{ name: string }>): ReactNode => {
  const [copied, copy] = useAtom(copyAtom);
  const click = useCallback(() => {
    copy(name);
  }, [copy, name]);
  return (
    <>
      <Button variant="outline" title={HINT} onClick={click}>
        {iconOf(AsyncResult.isSuccess(copied))}
        {LABEL}
      </Button>
      <output className="sr-only">
        {statusOf(AsyncResult.isSuccess(copied), AsyncResult.isFailure(copied))}
      </output>
    </>
  );
};
