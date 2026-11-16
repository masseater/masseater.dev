import { Array as Arr } from "effect";
import type { ReactNode } from "react";

import type { Heading } from "#/entities/article/index.ts";

import { InlineTocBox } from "./inline-toc-box.tsx";

export const InlineToc = ({
  label,
  headings,
}: Readonly<{ label: string; headings: readonly Heading[] }>): ReactNode =>
  Arr.isReadonlyArrayNonEmpty(headings) && <InlineTocBox headings={headings} label={label} />;
