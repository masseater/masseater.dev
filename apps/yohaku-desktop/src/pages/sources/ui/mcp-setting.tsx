import { Option } from "effect";
import type { ReactNode } from "react";

import { useMcp } from "#/pages/sources/api/sources.ts";

import { McpCommand } from "./mcp-command.tsx";

const TITLE = "MCP";

const McpSetting = (): ReactNode => {
  const mcp = useMcp();
  if (Option.isNone(mcp)) {
    return false;
  }
  return (
    <section aria-label={TITLE} className="flex flex-col gap-2.5">
      <h2 className="text-sm font-bold">{TITLE}</h2>
      <McpCommand mcp={mcp.value} />
    </section>
  );
};

export { McpSetting };
