import type { ReactNode } from "react";

import type { MonthTotalValue } from "#/entities/money";
import { Section } from "#/shared/ui";

import { MonthlyContent } from "./monthly-content";

const TITLE = "毎月の収支推移";

export const MonthlyCard = ({
  months,
}: Readonly<{ months: readonly MonthTotalValue[] }>): ReactNode => (
  <Section title={TITLE}>
    <MonthlyContent months={months} title={TITLE} />
  </Section>
);
