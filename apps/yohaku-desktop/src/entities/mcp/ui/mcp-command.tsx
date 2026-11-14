import type { ReactNode } from "react";

import type { Mcp } from "#/shared/api";

import { CopyCommandButton } from "./copy-command-button.tsx";

const McpCommand = ({ mcp }: Readonly<{ mcp: Mcp }>): ReactNode => (
  <div className="flex items-center gap-2 rounded-md border px-2.5 py-2">
    <span className="grow truncate font-mono text-xs">{mcp.url}</span>
    <CopyCommandButton mcp={mcp} />
  </div>
);

export { McpCommand };
