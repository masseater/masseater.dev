import { Button } from "@masseater.dev/ui/button";
import { Copy } from "lucide-react";
import type { ReactNode } from "react";

import { useMcp } from "#/pages/sources/api/sources.ts";

const commandFor = ({ url, token }: Readonly<{ url: string; token: string }>): string =>
  `claude mcp add --transport http yohaku ${url} --header "Authorization: Bearer ${token}"`;

const McpSetting = (): ReactNode => {
  const mcp = useMcp();
  if (mcp === undefined) {
    return null;
  }
  return (
    <section aria-label="MCP" className="flex flex-col gap-2.5">
      <h2 className="text-sm font-bold">MCP</h2>
      <div className="flex items-center gap-2 rounded-md border px-2.5 py-2">
        <span className="grow truncate font-mono text-xs">{mcp.url}</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void navigator.clipboard.writeText(commandFor(mcp))}
        >
          <Copy aria-hidden="true" />
          コマンドをコピー
        </Button>
      </div>
    </section>
  );
};

export { McpSetting };
