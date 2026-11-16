import { useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import type { ReactNode } from "react";

import { chooseFileAtom, openFileAtom, openLinkAtom } from "#src/features/open-media/model/open.ts";

export const Refusal = (): ReactNode => {
  const link = AsyncResult.error(useAtomValue(openLinkAtom));
  const file = AsyncResult.error(useAtomValue(openFileAtom));
  const chosen = AsyncResult.error(useAtomValue(chooseFileAtom));
  return Option.match(Option.firstSomeOf([link, file, chosen]), {
    onNone: () => false,
    onSome: ({ message }) => (
      <p role="alert" className="text-destructive basis-full text-xs">
        {message}
      </p>
    ),
  });
};
