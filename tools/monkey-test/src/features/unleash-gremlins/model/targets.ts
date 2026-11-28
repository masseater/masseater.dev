import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import type { Surface } from "./observation.ts";

export type Target = Readonly<{
  surface: Surface;
  origin: string;
  bearer: Option.Option<string>;
  init: Option.Option<string>;
  discover: boolean;
  seed: number;
}>;

export type SiteInput = Readonly<{
  publicHosts: readonly string[];
  tokens: Readonly<Record<string, string>>;
  seed: number;
}>;

const siteTarget = (host: string, seed: number, bearer: Option.Option<string>): Target => ({
  surface: "page",
  origin: `https://${host}`,
  bearer,
  init: Option.none(),
  discover: true,
  seed,
});

export const siteTargetsOf = ({ publicHosts, tokens, seed }: SiteInput): readonly Target[] => [
  ...pipe(
    publicHosts,
    Arr.map((host) => siteTarget(host, seed, Option.none())),
  ),
  ...pipe(
    Rec.toEntries(tokens),
    Arr.map(([host, token]) => siteTarget(host, seed, Option.some(token))),
  ),
];
