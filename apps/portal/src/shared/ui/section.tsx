import type { ReactNode } from "react";

import { Card } from "./card";
import { CardHeader } from "./card-header";

export const Section = ({
  children,
  meta,
  title,
}: Readonly<{ children: ReactNode; meta?: string | undefined; title: string }>): ReactNode => (
  <Card>
    <CardHeader meta={meta} title={title} />
    {children}
  </Card>
);
