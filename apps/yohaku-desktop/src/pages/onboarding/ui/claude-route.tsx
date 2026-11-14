import { Option } from "effect";
import { Terminal } from "lucide-react";
import type { ReactNode } from "react";

import { CopyCommandButton, useMcp } from "#/entities/mcp";

const LABEL = "Claude Code に原作を読ませる";

const ClaudeRoute = (): ReactNode => {
  const mcp = useMcp();
  if (Option.isNone(mcp)) {
    return false;
  }
  return (
    <li className="flex items-center gap-2">
      <Terminal aria-hidden="true" className="size-4 shrink-0" />
      <span className="grow">{LABEL}</span>
      <CopyCommandButton mcp={mcp.value} />
    </li>
  );
};

export { ClaudeRoute };
