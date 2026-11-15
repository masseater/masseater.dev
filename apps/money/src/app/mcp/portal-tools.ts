import { READ_ONLY } from "@masseater.dev/mcp-tool-call";
import type { Option } from "effect";
import { Array as Arr, pipe } from "effect";

import type { DefinedTool } from "#/entities/ledger";
import { CATEGORY_TOOLS } from "#/features/categorize";
import { LEDGER_TOOLS } from "#/features/import-statements";
import { REPORT_TOOLS } from "#/features/report";

const READ_TOOLS = pipe(
  [...LEDGER_TOOLS, ...CATEGORY_TOOLS, ...REPORT_TOOLS],
  Arr.filter(({ annotations }) => annotations === READ_ONLY),
);

/** @internal */
export const readTool = (name: string): Option.Option<DefinedTool> =>
  Arr.findFirst(READ_TOOLS, (defined) => defined.name === name);
