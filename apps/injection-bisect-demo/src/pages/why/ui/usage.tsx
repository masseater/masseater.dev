import type { ReactNode } from "react";

import { COPY } from "#/pages/why/model/copy";

import { CodeBlock } from "./code-block";
import { Section } from "./section";

const Usage = (): ReactNode => (
  <Section title={COPY.usage.title}>
    <CodeBlock code={COPY.usage.install} />
    <CodeBlock code={COPY.usage.code} />
  </Section>
);

export { Usage };
