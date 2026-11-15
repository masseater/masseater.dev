import { READ_ONLY } from "@masseater.dev/mcp-tool-call";
import type { Option } from "effect";
import { Array as Arr, pipe } from "effect";

import { CATEGORY_TOOLS } from "./category-tools";
import { LEDGER_TOOLS } from "./ledger-tools";
import { REPORT_TOOLS } from "./report-tools";
import type { DefinedTool } from "./tool";

const READ_TOOLS = pipe(
  [...LEDGER_TOOLS, ...CATEGORY_TOOLS, ...REPORT_TOOLS],
  Arr.filter(({ annotations }) => annotations === READ_ONLY),
);

const readTool = (name: string): Option.Option<DefinedTool> =>
  Arr.findFirst(READ_TOOLS, (defined) => defined.name === name);

/** @internal */
export { readTool };
