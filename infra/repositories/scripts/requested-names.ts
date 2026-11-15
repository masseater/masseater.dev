import { fail, mask } from "@masseater.dev/github-workflow";
import { Array as Arr, Config, Effect, String as Str, pipe } from "effect";

import { installedRepositories } from "./installed-repositories.ts";

const NAME = /^[A-Za-z0-9._-]+$/u;

const namesIn = Effect.fn("namesIn")(function* namesIn(variable: string) {
  const value = yield* Config.String(variable).pipe(Config.withDefault(""));
  const names = pipe(Str.split(",")(value), Arr.map(Str.trim), Arr.filter(Str.isNonEmpty));
  if (!Arr.isReadonlyArrayNonEmpty(names)) {
    return yield* fail(`${variable} is empty`);
  }
  if (
    !pipe(
      names,
      Arr.every((name) => NAME.test(name)),
    )
  ) {
    return yield* fail(`${variable} holds an invalid name`);
  }
  return names;
});

const installedNamesIn = Effect.fn("installedNamesIn")(function* installedNamesIn(
  variable: string,
) {
  const names = yield* namesIn(variable);
  yield* Effect.forEach(names, mask, { discard: true });
  const repositories = yield* installedRepositories;
  const installed = pipe(
    repositories,
    Arr.map(({ name }) => name),
  );
  const missing = Arr.difference(names, installed);
  if (Arr.isReadonlyArrayNonEmpty(missing)) {
    return yield* fail(`${Arr.join(missing, ", ")} is not installed for the GitHub App`);
  }
  return names;
});

/** @internal */
export const requestedNames = namesIn;

/** @internal */
export const requestedRepositories = installedNamesIn;
