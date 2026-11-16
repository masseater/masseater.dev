import { useAtom } from "@effect/atom-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { verbAtom } from "#/features/mark-range/model/draft.ts";
import { VERB_LABELS } from "#/shared/api/index.ts";
import type { Verb } from "#/shared/api/index.ts";

import { TOGGLE } from "./toggle.ts";

export const VerbButton = ({ verb }: Readonly<{ verb: Verb }>): ReactNode => {
  const [chosen, choose] = useAtom(verbAtom);
  const pick = useCallback(() => {
    choose(verb);
  }, [choose, verb]);
  return (
    <button type="button" aria-pressed={chosen === verb} className={TOGGLE} onClick={pick}>
      {VERB_LABELS[verb]}
    </button>
  );
};
