import { Heading } from "@masseater.dev/ui/heading";
import type { ReactNode } from "react";

export const SectionHeading = ({
  title,
  count,
}: Readonly<{ title: string; count?: number }>): ReactNode => (
  <Heading variant="marked" count={count}>
    {title}
  </Heading>
);
