import { Array as Arr } from "effect";
import type { ReactNode } from "react";

import type { MoneyFlowValue } from "#/entities/money/index.ts";
import { LINK_FILLS, linkTone } from "#/pages/money/model/flow.ts";

type FlowLinkProps = Readonly<{
  flow: MoneyFlowValue;
  sourceX?: number;
  sourceY?: number;
  sourceControlX?: number;
  targetX?: number;
  targetY?: number;
  targetControlX?: number;
  linkWidth?: number;
  index?: number;
}>;

const NONE = 0;

const HALF = 2;

export const FlowLink = ({
  flow,
  sourceX = NONE,
  sourceY = NONE,
  sourceControlX = NONE,
  targetX = NONE,
  targetY = NONE,
  targetControlX = NONE,
  linkWidth = NONE,
  index = NONE,
}: FlowLinkProps): ReactNode => {
  const half = linkWidth / HALF;
  const path = [
    `M${String(sourceX)},${String(sourceY - half)}`,
    `C${String(sourceControlX)},${String(sourceY - half)} ${String(targetControlX)},${String(targetY - half)} ${String(targetX)},${String(targetY - half)}`,
    `L${String(targetX)},${String(targetY + half)}`,
    `C${String(targetControlX)},${String(targetY + half)} ${String(sourceControlX)},${String(sourceY + half)} ${String(sourceX)},${String(sourceY + half)}`,
    "Z",
  ];
  return <path d={Arr.join(path, " ")} fill={LINK_FILLS[linkTone(flow)(index)]} />;
};
