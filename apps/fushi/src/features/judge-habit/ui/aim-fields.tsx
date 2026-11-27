import { useAtomValue } from "@effect/atom-react";
import type { ReactNode } from "react";

import type { Aim } from "#/entities/library/index.ts";
import { NEW_AIM, aimChoiceAtom, chosenAim } from "#/features/judge-habit/model/decide.ts";
import { LABELS } from "#/shared/config/index.ts";

import { AimSelect } from "./aim-select.tsx";
import { TextField } from "./text-field.tsx";

export const AimFields = ({
  habit,
  aims,
}: Readonly<{ habit: string; aims: readonly Aim[] }>): ReactNode => {
  const aim = chosenAim({ aims, chosen: useAtomValue(aimChoiceAtom(habit)) });
  return (
    <>
      <AimSelect habit={habit} aims={aims} />
      {aim === NEW_AIM && <TextField habit={habit} label={LABELS.newAimName} />}
    </>
  );
};
