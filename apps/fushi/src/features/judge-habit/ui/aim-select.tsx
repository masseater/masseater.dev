import { useAtom } from "@effect/atom-react";
import { Array as Arr, Option, pipe } from "effect";
import { useCallback } from "react";
import type { ChangeEvent, ReactNode } from "react";

import type { Aim } from "#/entities/library/index.ts";
import { NEW_AIM, aimChoiceAtom, chosenAim } from "#/features/judge-habit/model/decide.ts";
import { LABELS } from "#/shared/config/index.ts";

export const AimSelect = ({
  habit,
  aims,
}: Readonly<{ habit: string; aims: readonly Aim[] }>): ReactNode => {
  const [chosen, choose] = useAtom(aimChoiceAtom(habit));
  const change = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      choose(Option.some(event.currentTarget.value));
    },
    [choose],
  );
  return (
    <select
      aria-label={LABELS.aim}
      value={chosenAim({ aims, chosen })}
      className="border-input bg-background h-8 rounded-md border px-2 text-sm"
      onChange={change}
    >
      {pipe(
        aims,
        Arr.map((aim) => (
          <option key={aim.id} value={aim.id}>
            {aim.name}
          </option>
        )),
      )}
      <option value={NEW_AIM}>{LABELS.newAim}</option>
    </select>
  );
};
