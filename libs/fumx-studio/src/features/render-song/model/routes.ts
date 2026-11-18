import { Array as Arr, Option, pipe } from "effect";

import type { Bus } from "#/shared/lib/studio/bus.ts";

import type { Send } from "./params.ts";

export interface Route {
  readonly into: Bus;
  readonly amount: number;
}

const routeOf =
  (buses: ReadonlyMap<string, Bus>) =>
  (send: Send): readonly Route[] =>
    pipe(
      Option.fromNullishOr(buses.get(send.bus)),
      Option.map((into): Route => ({ into, amount: send.amount })),
      Option.toArray,
    );

export const routesOf =
  (buses: ReadonlyMap<string, Bus>) =>
  (sends: readonly Send[]): readonly Route[] =>
    pipe(sends, Arr.flatMap(routeOf(buses)));
