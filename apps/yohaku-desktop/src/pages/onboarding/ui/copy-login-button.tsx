import { Button } from "@masseater.dev/ui/button";
import { Effect } from "effect";
import { Copy } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

export const LOGIN = "claude auth login";
const LABEL = "コピー";

export const CopyLoginButton = (): ReactNode => {
  const onClick = useCallback(() => {
    Effect.runFork(Effect.promise(() => navigator.clipboard.writeText(LOGIN)));
  }, []);
  return (
    <Button size="sm" variant="outline" onClick={onClick}>
      <Copy aria-hidden="true" />
      {LABEL}
    </Button>
  );
};
