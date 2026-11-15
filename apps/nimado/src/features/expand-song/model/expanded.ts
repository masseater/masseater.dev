import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Atom } from "effect/reactivity";
import { useCallback } from "react";

const expandedAtom = Atom.family((_id: number) => Atom.make(false));

const useExpanded = (id: number): readonly [boolean, () => void] => {
  const atom = expandedAtom(id);
  const open = useAtomValue(atom);
  const setOpen = useAtomSet(atom);
  const toggle = useCallback(() => {
    setOpen((current) => !current);
  }, [setOpen]);
  return [open, toggle];
};

export { useExpanded };
