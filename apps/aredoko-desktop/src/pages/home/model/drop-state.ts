import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Atom } from "effect/reactivity";

const dragOverAtom = Atom.make(false);

const useDragOver = (): boolean => useAtomValue(dragOverAtom);

const useSetDragOver = (): ((over: boolean) => void) => useAtomSet(dragOverAtom);

export { useDragOver, useSetDragOver };
