import type { ReactNode } from "react";

import type { BalanceSheetValue } from "#/entities/money/index.ts";
import { leftBlocks, rightBlocks, sideTotal } from "#/pages/money/model/sheet.ts";
import { Section } from "#/shared/ui/index.ts";

import { SheetChart } from "./sheet-chart.tsx";

const TEXT = { title: "貸借対照表", empty: "残高の記録がありません" } as const;

const NONE = 0;

export const SheetCard = ({
  asOf,
  sheet,
}: Readonly<{ asOf: string; sheet: BalanceSheetValue }>): ReactNode => {
  const left = leftBlocks(sheet);
  const right = rightBlocks(sheet);
  const whole = Math.max(sideTotal(left), sideTotal(right));
  return (
    <Section meta={`${asOf} 時点`} title={TEXT.title}>
      {whole <= NONE && <p className="text-muted-foreground text-sm">{TEXT.empty}</p>}
      {whole > NONE && <SheetChart left={left} right={right} title={TEXT.title} />}
    </Section>
  );
};
