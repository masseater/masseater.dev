import type { ReactNode } from "react";

import type { MoneyFlowValue } from "#/entities/money";
import { Section } from "#/shared/ui";

import { FlowChart } from "./flow-chart";

const TITLE = "お金の流れ";

const FlowSection = ({ flow }: Readonly<{ flow: MoneyFlowValue }>): ReactNode => (
  <Section title={TITLE}>
    <div className="overflow-x-auto">
      <FlowChart flow={flow} title={TITLE} />
    </div>
  </Section>
);

export { FlowSection };
