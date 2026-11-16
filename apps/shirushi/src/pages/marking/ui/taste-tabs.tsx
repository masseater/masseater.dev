import { useAtom } from "@effect/atom-react";
import { Array as Arr, Option, pipe } from "effect";
import { useCallback } from "react";
import type { KeyboardEvent, ReactNode } from "react";

import { tabAtom } from "#/pages/marking/model/tab.ts";
import type { TabId } from "#/pages/marking/model/tab.ts";

import { TabButton } from "./tab-button.tsx";

export type Tab = Readonly<{ id: TabId; label: string; waiting: number; panel: ReactNode }>;

const NEXT = 1;

const PREVIOUS = -1;

const STEPS: ReadonlyMap<string, number> = new Map([
  ["ArrowRight", NEXT],
  ["ArrowLeft", PREVIOUS],
]);

const FIRST = 0;

const neighbour =
  (tabs: Arr.NonEmptyReadonlyArray<Tab>) =>
  (step: number) =>
  (current: Tab): Tab => {
    const index = pipe(
      tabs,
      Arr.findFirstIndex(({ id }) => id === current.id),
      Option.getOrElse(() => FIRST),
    );
    return pipe(
      Arr.get(tabs, (index + step + tabs.length) % tabs.length),
      Option.getOrElse(() => Arr.headNonEmpty(tabs)),
    );
  };

const focusTab = (id: TabId): void => {
  Option.map(
    Option.fromNullishOr(globalThis.document.querySelector<HTMLElement>(`#tab-${id}`)),
    (tab) => {
      tab.focus();
      return tab;
    },
  );
};

export const TasteTabs = ({
  tabs,
}: Readonly<{ tabs: Arr.NonEmptyReadonlyArray<Tab> }>): ReactNode => {
  const [chosen, select] = useAtom(tabAtom);
  const active = pipe(
    tabs,
    Arr.findFirst(({ id }) => id === chosen),
    Option.getOrElse(() => Arr.headNonEmpty(tabs)),
  );
  const move = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      const step = Option.fromNullishOr(STEPS.get(event.key));
      if (Option.isNone(step)) {
        return;
      }
      event.preventDefault();
      const next = neighbour(tabs)(step.value)(active);
      select(next.id);
      focusTab(next.id);
    },
    [tabs, active, select],
  );
  return (
    <div className="grid gap-3">
      <div role="tablist" className="border-border flex border-b">
        {pipe(
          tabs,
          Arr.map((tab) => (
            <TabButton
              key={tab.id}
              id={tab.id}
              label={tab.label}
              waiting={tab.waiting}
              active={tab.id === active.id}
              onKeyDown={move}
            />
          )),
        )}
      </div>
      <div role="tabpanel" id={`panel-${active.id}`} aria-labelledby={`tab-${active.id}`}>
        {active.panel}
      </div>
    </div>
  );
};
