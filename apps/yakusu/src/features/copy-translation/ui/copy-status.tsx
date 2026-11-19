import type { ReactNode } from "react";

import type { Copy } from "#/features/copy-translation/model/copy.ts";
import { useCopy } from "#/features/copy-translation/model/copy.ts";

const MESSAGES: Readonly<Record<Copy, string>> = {
  idle: "",
  copied: "コピーしました",
  failed: "コピーできませんでした",
};

export const CopyStatus = (): ReactNode => (
  <output className="sr-only">{MESSAGES[useCopy()]}</output>
);
