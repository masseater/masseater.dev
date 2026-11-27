import type { ReactNode } from "react";

import type { Shares } from "#/features/find-candidates/index.ts";
import { LABELS } from "#/shared/config/index.ts";
import { Fact } from "#/shared/ui/index.ts";

const PERCENT = 100;

const percent = (share: number): string => `${Math.round(share * PERCENT)}%`;

export const ShareFacts = ({ shares }: Readonly<{ shares: Shares }>): ReactNode => (
  <>
    <Fact>{`${LABELS.inSongs} ${percent(shares.share)}`}</Fact>
    <Fact>{`${LABELS.inBaseline} ${percent(shares.baselineShare)}`}</Fact>
  </>
);
