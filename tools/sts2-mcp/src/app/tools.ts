import { actTool } from "#/features/act-in-game/index.ts";
import { guestTools } from "#/features/manage-guest/index.ts";
import { observeTools } from "#/features/observe-game/index.ts";
import { registerToolList } from "#/shared/api/index.ts";

/** @internal */
export const registerTools = registerToolList([...guestTools, ...observeTools, actTool]);
