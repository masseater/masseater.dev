import type { McpAccess } from "@masseater.dev/shirushi-protocol";
import { Effect } from "effect";

import { mcpAccess } from "#/shared/api";
import { runtime } from "#/shared/lib/runtime";

const commandOf = ({ url, token }: McpAccess): string =>
  `claude mcp add --transport http shirushi ${url} --header "Authorization: Bearer ${token}"`;

const copied = (access: McpAccess): Effect.Effect<void> =>
  Effect.promise(() => navigator.clipboard.writeText(commandOf(access)));

/** @internal */
export const copyAtom = runtime.fn(() => mcpAccess.pipe(Effect.flatMap(copied)));
