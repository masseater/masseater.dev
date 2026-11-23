import type { FumxPlugin, Plugins } from "@masseater.dev/fumx-studio/plugin/plugin";
import type { Song as FumxSong } from "@r_masseater/fumx-parser";
import { Array as Arr, Effect, Option, Record as Rec, String as Str, pipe } from "effect";

const SLUG = 2;

const fumxSongs = import.meta.glob<FumxSong>("./catalog/*/song.fumx", { import: "song" });

const pluginModules = import.meta.glob<FumxPlugin>("./catalog/*/plugins/*.ts", {
  import: "plugin",
});

const slugOf = (path: string): Option.Option<string> => Arr.get(Str.split(path, "/"), SLUG);

export const bySlug = <Value>(found: Readonly<Record<string, Value>>): ReadonlyMap<string, Value> =>
  new Map(
    pipe(
      Rec.toEntries(found),
      Arr.flatMap(([path, value]) =>
        pipe(
          slugOf(path),
          Option.map((slug): readonly [string, Value] => [slug, value]),
          Option.toArray,
        ),
      ),
    ),
  );

export const fumxBySlug = bySlug(fumxSongs);

type Loaded = readonly [string, FumxPlugin];

const loadedIn =
  (folder: string) =>
  ([path, load]: readonly [string, () => Promise<FumxPlugin>]): Effect.Effect<Loaded> => {
    const name = Str.slice(folder.length)(path);
    return Effect.map(Effect.promise(load), (plugin): Loaded => [name, plugin]);
  };

export const pluginsOf = (slug: string): Effect.Effect<Plugins> => {
  const folder = `./catalog/${slug}/`;
  const modules = pipe(
    Rec.toEntries(pluginModules),
    Arr.filter(([path]) => Str.startsWith(folder)(path)),
  );
  return Effect.map(
    Effect.forEach(modules, loadedIn(folder), { concurrency: "unbounded" }),
    Rec.fromEntries,
  );
};

const songLoaded = (slug: string): Effect.Effect<FumxSong> =>
  Option.match(Option.fromUndefinedOr(fumxBySlug.get(slug)), {
    onNone: () => Effect.die(slug),
    onSome: (load) => Effect.promise(load),
  });

export interface FumxSource {
  readonly song: FumxSong;
  readonly plugins: Plugins;
}

export const fumxSourceOf = (slug: string): Promise<FumxSource> =>
  Effect.runPromise(
    Effect.all({ song: songLoaded(slug), plugins: pluginsOf(slug) }, { concurrency: "unbounded" }),
  );
