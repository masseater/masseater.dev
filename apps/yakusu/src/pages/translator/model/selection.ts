import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Array, pipe } from "effect";
import { Atom } from "effect/reactivity";

import type { LanguageCode } from "./languages.ts";

type Source = Readonly<{ kind: "detect" }> | Readonly<{ kind: "language"; code: LanguageCode }>;

type Side = "source" | "target";

type Picker = Readonly<{ kind: "closed" }> | Readonly<{ kind: "open"; side: Side }>;

type Selection = Readonly<{ source: Source; target: LanguageCode }>;

const RECENT_SIZE = 3;

const sourceAtom = Atom.make<Source>({ kind: "detect" });

const targetAtom = Atom.make<LanguageCode>("ja");

const recentSourcesAtom = Atom.make<readonly LanguageCode[]>(["ja", "en", "zh-hans"]);

const recentTargetsAtom = Atom.make<readonly LanguageCode[]>(["ja", "en", "zh-hans"]);

const pickerAtom = Atom.make<Picker>({ kind: "closed" });

const withRecent = ({
  recents,
  code,
}: Readonly<{ recents: readonly LanguageCode[]; code: LanguageCode }>): readonly LanguageCode[] => {
  if (Array.contains(recents, code)) {
    return recents;
  }
  return pipe(recents, Array.prepend(code), Array.take(RECENT_SIZE));
};

const useSource = (): Source => useAtomValue(sourceAtom);

const useTarget = (): LanguageCode => useAtomValue(targetAtom);

const useSelection = (): Selection => ({ source: useSource(), target: useTarget() });

const useRecentSources = (): readonly LanguageCode[] => useAtomValue(recentSourcesAtom);

const useRecentTargets = (): readonly LanguageCode[] => useAtomValue(recentTargetsAtom);

const usePicker = (): Picker => useAtomValue(pickerAtom);

const useSetPicker = (): ((picker: Picker) => void) => useAtomSet(pickerAtom);

const useSelect = (): ((selection: Selection) => void) => {
  const setSource = useAtomSet(sourceAtom);
  const setTarget = useAtomSet(targetAtom);
  const setRecentSources = useAtomSet(recentSourcesAtom);
  const setRecentTargets = useAtomSet(recentTargetsAtom);
  const setPicker = useAtomSet(pickerAtom);
  return ({ source, target }) => {
    setSource(source);
    setTarget(target);
    if (source.kind === "language") {
      setRecentSources((recents) => withRecent({ recents, code: source.code }));
    }
    setRecentTargets((recents) => withRecent({ recents, code: target }));
    setPicker({ kind: "closed" });
  };
};

export {
  usePicker,
  useRecentSources,
  useRecentTargets,
  useSelect,
  useSelection,
  useSetPicker,
  useSource,
};
export type { Picker, Selection, Side, Source };
