import { Effect, Fiber, Option } from "effect";

import type { Report } from "./output.ts";
import type { Panes } from "./playground.ts";

export type Pane = keyof Panes;

export type Mount = Readonly<{ container: HTMLElement; report: Report }>;

const paneOf = (container: HTMLElement, pane: Pane): Option.Option<HTMLElement> =>
  Option.fromNullishOr(container.querySelector<HTMLElement>(`[data-pane="${pane}"]`));

export const mountPlayground = ({ container, report }: Mount): (() => void) => {
  const fiber = Effect.runFork(
    Option.all({
      rpp: paneOf(container, "rpp"),
      generated: paneOf(container, "generated"),
      main: paneOf(container, "main"),
    }).pipe(
      Effect.fromOption,
      Effect.flatMap((panes) =>
        Effect.promise(() => import("./playground.ts")).pipe(
          Effect.flatMap(({ runPlayground }) => Effect.scoped(runPlayground({ panes, report }))),
        ),
      ),
    ),
  );
  return () => {
    Effect.runFork(Fiber.interrupt(fiber));
  };
};
