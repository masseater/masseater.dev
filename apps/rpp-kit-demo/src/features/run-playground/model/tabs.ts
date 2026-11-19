import { useAtom } from "@effect/atom-react";
import { Option, pipe } from "effect";
import { Atom } from "effect/reactivity";
import { useCallback } from "react";
import type { KeyboardEvent } from "react";

export type SourceTab = "main" | "rpp";

export type Tabs<Tab> = readonly [Tab, (tab: Tab) => void];

const sourceTabAtom = Atom.make<SourceTab>("main").pipe(Atom.keepAlive);

export const useSourceTab = (): Tabs<SourceTab> => useAtom(sourceTabAtom);

const OTHER: Readonly<Record<SourceTab, SourceTab>> = { main: "rpp", rpp: "main" };

const other = (current: SourceTab): SourceTab => OTHER[current];

const KEYS: ReadonlyMap<string, (current: SourceTab) => SourceTab> = new Map([
  ["ArrowLeft", other],
  ["ArrowRight", other],
  ["Home", (): SourceTab => "main"],
  ["End", (): SourceTab => "rpp"],
]);

const focusTab = (from: HTMLElement, tab: SourceTab): void => {
  pipe(
    Option.fromNullishOr(from.parentElement),
    Option.flatMapNullishOr((list) => list.querySelector<HTMLElement>(`[data-tab="${tab}"]`)),
    Option.map((button) => {
      button.focus();
      return button;
    }),
  );
};

export const useTabKeys = (): ((event: KeyboardEvent<HTMLButtonElement>) => void) => {
  const [tab, setTab] = useSourceTab();
  return useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      const next = Option.map(Option.fromNullishOr(KEYS.get(event.key)), (step) => step(tab));
      if (Option.isNone(next)) {
        return;
      }
      event.preventDefault();
      setTab(next.value);
      focusTab(event.currentTarget, next.value);
    },
    [tab, setTab],
  );
};
