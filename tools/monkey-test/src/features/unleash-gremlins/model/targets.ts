import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import type { Surface } from "./observation.ts";
import type { DesktopApp } from "./tauri-config.ts";
import { tauriMockScript } from "./tauri-mock.ts";

export type Target = Readonly<{
  surface: Surface;
  origin: string;
  bearer: Option.Option<string>;
  init: Option.Option<string>;
  discover: boolean;
  serve: Option.Option<DesktopApp>;
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
  serve: Option.none(),
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

export const desktopTargetsOf = (
  input: Readonly<{ apps: readonly DesktopApp[]; seed: number }>,
): readonly Target[] =>
  pipe(
    input.apps,
    Arr.map((app, index) => ({
      surface: "desktop" as const,
      origin: new URL(app.url).origin,
      bearer: Option.none(),
      init: Option.some(tauriMockScript),
      discover: false,
      serve: Option.some(app),
      seed: input.seed + index,
    })),
  );
