import { Array as Arr, Option, pipe } from "effect";

import type { SettingsValue } from "#/entities/money";

type Labeled = Readonly<{ id: string; label: string }>;

const labelIn =
  (entries: readonly Labeled[]) =>
  (id: string): string =>
    pipe(
      Arr.findFirst(entries, (entry) => entry.id === id),
      Option.match({ onNone: () => id, onSome: (entry) => entry.label }),
    );

const categoryLabel = (settings: SettingsValue): ((id: string) => string) =>
  labelIn(settings.categories);

const accountLabel = (settings: SettingsValue): ((id: string) => string) =>
  labelIn(
    pipe(
      settings.accounts,
      Arr.map((account) => ({ id: account.id, label: account.name })),
    ),
  );

export { accountLabel, categoryLabel };
