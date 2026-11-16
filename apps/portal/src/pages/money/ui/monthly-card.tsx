import type { ReactNode } from "react";

import type { MonthTotalValue } from "#/entities/money/index.ts";
import { Section } from "#/shared/ui/index.ts";

import { MonthlyContent } from "./monthly-content.tsx";

const TITLE = "毎月の収支推移";

export const MonthlyCard = ({
  months,
}: Readonly<{ months: readonly MonthTotalValue[] }>): ReactNode => (
  <Section title={TITLE}>
    <MonthlyContent months={months} title={TITLE} />
  </Section>
);
