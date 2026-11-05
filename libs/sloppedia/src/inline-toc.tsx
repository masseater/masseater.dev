import { Array as Arr } from "effect";
import type { ReactNode } from "react";

import type { Heading } from "./headings.ts";
import { InlineTocBox } from "./inline-toc-box.tsx";

const InlineToc = ({
  label,
  headings,
}: Readonly<{ label: string; headings: readonly Heading[] }>): ReactNode =>
  Arr.isReadonlyArrayNonEmpty(headings) && <InlineTocBox headings={headings} label={label} />;

export { InlineToc };
