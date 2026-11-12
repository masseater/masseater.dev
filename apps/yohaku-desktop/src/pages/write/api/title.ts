import { useAtom, useAtomValue } from "@effect/atom-react";
import type { Title } from "@masseater.dev/yohaku-protocol";
import { useMutation } from "@tanstack/react-query";
import { Effect, Option } from "effect";
import { useCallback } from "react";

import { manuscriptIdAtom, titleAtom } from "#/pages/write/model/writing-atoms.ts";
import { useYohaku } from "#/shared/api";

interface TitleField {
  readonly title: typeof Title.Type | null;
  readonly rename: (text: string) => void;
}

const useTitle = (): TitleField => {
  const yohaku = useYohaku();
  const id = useAtomValue(manuscriptIdAtom);
  const [title, setTitle] = useAtom(titleAtom);
  const renamed = useCallback(
    (text: string): Promise<void> =>
      Effect.runPromise(
        yohaku.setTitle({ id: Option.getOrThrow(id), text }).pipe(
          Effect.flatMap((manuscript) =>
            Effect.sync(() => {
              setTitle(manuscript.title);
            }),
          ),
        ),
      ),
    [id, setTitle, yohaku],
  );
  const { mutate } = useMutation({ mutationFn: renamed });
  return {
    title,
    rename: (text) => {
      if (Option.isSome(id)) {
        mutate(text);
      }
    },
  };
};

export { useTitle };
