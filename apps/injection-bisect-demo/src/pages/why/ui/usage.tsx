import type { ReactNode } from "react";

import { COPY } from "#/pages/why/model/copy.ts";

import { CodeBlock } from "./code-block.tsx";
import { Section } from "./section.tsx";

export const Usage = (): ReactNode => (
  <Section title={COPY.usage.title}>
    <CodeBlock code={COPY.usage.install} />
    <CodeBlock code={COPY.usage.code} />
  </Section>
);
