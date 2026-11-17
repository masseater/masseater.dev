import { createRequire } from "node:module";

import { Effect } from "effect";

import type { FailWith } from "#/shared/lib/fail.ts";
import { addonFileOf, platformTarget } from "#/shared/lib/target.ts";

export interface AddonSource<Addon, Failure> {
  readonly packageName: string;
  readonly binary: string;
  readonly from: string;
  readonly isAddon: (value: unknown) => value is Addon;
  readonly failWith: FailWith<Failure>;
}

export const loadAddon = <Addon, Failure>({
  packageName,
  binary,
  from,
  isAddon,
  failWith,
}: AddonSource<Addon, Failure>): Effect.Effect<Addon, Failure> => {
  const requireFrom = createRequire(from);
  const loadFrom = (specifier: string): Effect.Effect<unknown, Failure> =>
    Effect.try({
      try: (): unknown => requireFrom(specifier),
      catch: failWith(`could not load ${specifier}`),
    });
  return loadFrom(`${packageName}-${platformTarget}`).pipe(
    Effect.catchCause(() => loadFrom(`${packageName}/native/${addonFileOf(binary)}`)),
    Effect.filterOrFail(isAddon, (found) =>
      failWith(`no ${binary} addon for ${platformTarget}`)(found),
    ),
  );
};

export interface Telemetered {
  readonly flushTelemetry: () => Promise<void>;
}

export interface AddonCall<Addon extends Telemetered, Result, Failure> {
  readonly addon: Effect.Effect<Addon, Failure>;
  readonly name: string;
  readonly files: number;
  readonly call: (addon: Addon) => Result;
  readonly failWith: FailWith<Failure>;
}

export const callAddon = <Addon extends Telemetered, Result, Failure>({
  addon,
  name,
  files,
  call,
  failWith,
}: AddonCall<Addon, Result, Failure>): Effect.Effect<Result, Failure> =>
  addon.pipe(
    Effect.flatMap((loaded) =>
      Effect.try({ try: () => call(loaded), catch: failWith(`${name} could not lint`) }).pipe(
        Effect.tap(() => Effect.promise(() => loaded.flushTelemetry())),
      ),
    ),
    Effect.withSpan(`${name}.native`, { attributes: { [`${name}.files`]: files } }),
  );
