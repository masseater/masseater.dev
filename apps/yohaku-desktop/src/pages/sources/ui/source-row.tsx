import type { Source } from "@masseater.dev/yohaku-protocol";
import { Button } from "@masseater.dev/ui/button";
import type { ReactNode } from "react";

import { useRevert } from "#/pages/sources/api/sources.ts";

const ORIGINS: Readonly<Record<(typeof Source.Type)["origin"], string>> = {
  manuscript: "本文",
  mcp: "MCP",
  agent: "取り込み",
};

const SourceRow = ({ source }: Readonly<{ source: typeof Source.Type }>): ReactNode => {
  const revert = useRevert();
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_10rem_6rem_5rem] items-center gap-3 border-b py-2.5">
      <span className="truncate font-medium">{source.label}</span>
      <span className="text-muted-foreground">
        {source.origin === "mcp" ? source.client : ORIGINS[source.origin]}
      </span>
      <span className="text-muted-foreground">{source.facts} 件</span>
      {source.origin === "manuscript" ? (
        <span />
      ) : (
        <Button size="sm" variant="outline" onClick={() => revert(source.id)}>
          戻す
        </Button>
      )}
    </li>
  );
};

export { SourceRow };
