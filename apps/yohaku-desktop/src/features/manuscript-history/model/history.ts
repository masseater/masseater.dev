import { useAtom } from "@effect/atom-react";
import { Option } from "effect";
import { Atom } from "effect/reactivity";
import { useCallback } from "react";

const historyOfAtom = Atom.make(Option.none<string>());

export const useHistoryShown = (id: string): readonly [boolean, () => void] => {
  const [historyOf, setHistoryOf] = useAtom(historyOfAtom);
  const shown = Option.contains(historyOf, id);
  const toggle = useCallback(() => {
    setHistoryOf(Option.filter(Option.some(id), () => !shown));
  }, [id, setHistoryOf, shown]);
  return [shown, toggle];
};
