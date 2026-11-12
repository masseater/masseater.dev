import { useAtom, useAtomValue } from "@effect/atom-react";
import type { Title } from "@masseater.dev/yohaku-protocol";
import { useMutation } from "@tanstack/react-query";
import { Option } from "effect";

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
  const { mutate } = useMutation({
    mutationFn: async (text: string) => {
      const manuscript = await yohaku.setTitle({ id: Option.getOrThrow(id), text });
      setTitle(manuscript.title);
    },
  });
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
