import { useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import type { ReactNode } from "react";

import { chooseFileAtom, openFileAtom, openLinkAtom } from "#/features/open-media/model/open.ts";

export const Refusal = ({ id }: Readonly<{ id: string }>): ReactNode => {
  const link = useAtomValue(openLinkAtom).pipe(AsyncResult.error);
  const file = useAtomValue(openFileAtom).pipe(AsyncResult.error);
  const chosen = useAtomValue(chooseFileAtom).pipe(AsyncResult.error);
  return Option.match(Option.firstSomeOf([link, file, chosen]), {
    onNone: () => false,
    onSome: ({ message }) => (
      <p id={id} role="alert" className="text-destructive basis-full text-xs">
        {message}
      </p>
    ),
  });
};
