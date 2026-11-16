import { useAtomSet } from "@effect/atom-react";
import type { Choice, Pair } from "@masseater.dev/shirushi-protocol";
import { Match, Option } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { chooseAtom } from "#/features/choose-pair/model/choose.ts";
import { TOGGLE } from "#/shared/ui/index.ts";

const labelOf = (choice: Choice): string =>
  Match.value(choice).pipe(
    Match.when("a", () => "A"),
    Match.when("b", () => "B"),
    Match.when("neither", () => "どちらでもない"),
    Match.exhaustive,
  );

export const ChoiceButton = ({
  pair,
  choice,
}: Readonly<{ pair: Pair; choice: Choice }>): ReactNode => {
  const choose = useAtomSet(chooseAtom);
  const pick = useCallback(() => {
    choose({ id: pair.id, choice });
  }, [choose, pair.id, choice]);
  const chosen = Option.contains(Option.fromNullishOr(pair.choice), choice);
  return (
    <button type="button" aria-pressed={chosen} className={TOGGLE} onClick={pick}>
      {labelOf(choice)}
    </button>
  );
};
