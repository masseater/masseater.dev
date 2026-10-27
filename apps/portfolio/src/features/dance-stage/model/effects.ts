import { Effect, Option, Record as Rec, String as Str, pipe } from "effect";

const SHADER_DIR = "../shaders/";
const EXTENSION = ".frag";

const loaders = pipe(
  import.meta.glob<string>("../shaders/*.frag", { query: "?raw", import: "default" }),
  Rec.mapKeys((path) => pipe(path, Str.slice(SHADER_DIR.length, -EXTENSION.length))),
);

const hasEffect = (slug: string): boolean => Rec.has(loaders, slug);

const loadEffect = (slug: string): Effect.Effect<Option.Option<string>> =>
  Option.match(Rec.get(loaders, slug), {
    onNone: () => Effect.succeedNone,
    onSome: (load) => Effect.promise(load).pipe(Effect.asSome),
  });

export { hasEffect, loadEffect };
