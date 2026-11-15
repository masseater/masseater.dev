import { Option, pipe } from "effect";
import { Select } from "radix-ui";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { useSelectPackage, useSelectedPackage } from "#/entities/asset";

import { ALL_PACKAGES } from "./all-packages.ts";
import { ScopeMenu } from "./scope-menu.tsx";
import { ScopeTrigger } from "./scope-trigger.tsx";

const valueOf = (selected: Option.Option<number>): string =>
  pipe(
    selected,
    Option.map((id) => id.toString()),
    Option.getOrElse(() => ALL_PACKAGES),
  );

const idOf = (value: string): Option.Option<number> =>
  pipe(Option.some(Number(value)), Option.filter(Number.isInteger));

export const PackageScope = (): ReactNode => {
  const selected = useSelectedPackage();
  const select = useSelectPackage();
  const onValueChange = useCallback(
    (value: string) => {
      select(idOf(value));
    },
    [select],
  );
  return (
    <Select.Root value={valueOf(selected)} onValueChange={onValueChange}>
      <ScopeTrigger />
      <ScopeMenu />
    </Select.Root>
  );
};
