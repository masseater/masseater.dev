import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Atom } from "effect/reactivity";

const dragOverAtom = Atom.make(false);

export const useDragOver = (): boolean => useAtomValue(dragOverAtom);

export const useSetDragOver = (): ((over: boolean) => void) => useAtomSet(dragOverAtom);
