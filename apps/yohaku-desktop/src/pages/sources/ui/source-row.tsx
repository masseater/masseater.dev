import type { Source } from "@masseater.dev/yohaku-protocol";
import type { ReactNode } from "react";

import { RevertButton } from "#/entities/source";

type SourceType = typeof Source.Type;

const ORIGINS: Readonly<Record<SourceType["origin"], string>> = {
  manuscript: "本文",
  mcp: "MCP",
  agent: "取り込み",
};

const FACTS_UNIT = " 件";

const addedBy = ({ origin, client }: SourceType): string => {
  if (origin === "mcp") {
    return client;
  }
  return ORIGINS[origin];
};

const SourceRow = ({ source }: Readonly<{ source: SourceType }>): ReactNode => (
  <li className="flex items-center gap-3 border-b py-2.5">
    <span className="min-w-0 grow truncate font-medium">{source.label}</span>
    <span className="text-muted-foreground w-40 shrink-0">{addedBy(source)}</span>
    <span className="text-muted-foreground w-24 shrink-0">{`${source.facts.toString()}${FACTS_UNIT}`}</span>
    <span className="w-20 shrink-0">
      <RevertButton source={source} />
    </span>
  </li>
);

export { SourceRow };
