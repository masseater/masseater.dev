import type { McpAccess } from "@masseater.dev/media-notes-protocol";
import { Effect } from "effect";

import { mcpAccess } from "#src/shared/api/index.ts";
import { runtime } from "#src/shared/lib/runtime.ts";

const commandOf = (name: string, { url, token }: McpAccess): string =>
  `claude mcp add --transport http ${name} ${url} --header "Authorization: Bearer ${token}"`;

/** @internal */
export const copyAtom = runtime.fn((name: string) =>
  mcpAccess.pipe(
    Effect.flatMap((access) =>
      Effect.promise(() => navigator.clipboard.writeText(commandOf(name, access))),
    ),
  ),
);
