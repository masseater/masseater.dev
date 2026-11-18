import { Array as Arr, Option, Record as Rec, pipe } from "effect";
import { AstUtils, isReference } from "langium";
import type { AstNode, URI } from "langium";

import type { Effect } from "#/entities/song/index.ts";
import { isDeclaration, isSong } from "#generated/langium/ast.ts";
import type { Declaration, Song as SongNode } from "#generated/langium/ast.ts";

import { declarationsOf, isNamed, namespaceOf } from "./declarations.ts";
import type { Declarations } from "./declarations.ts";
import { pathFrom } from "./plugins.ts";
import { problemAt } from "./problem.ts";
import type { From, Problem } from "./problem.ts";
import { importedUriOf } from "./scope.ts";

export type Shared = Pick<
  Declarations,
  "samples" | "kits" | "instruments" | "buses" | "tracks" | "plugins"
>;

const uriOf: From<AstNode, URI> = (node) => AstUtils.getDocument(node).uri;

const referencedOf: From<Declaration, readonly Declaration[]> = (declaration) =>
  AstUtils.streamAst(declaration)
    .flatMap((node) => AstUtils.streamReferences(node))
    .map((info) => info.reference)
    .filter((reference) => isReference(reference))
    .map((reference) => reference.ref)
    .filter((target) => isDeclaration(target))
    .toArray();

const closureOf =
  (home: string): From<readonly Declaration[], readonly Declaration[]> =>
  (found) => {
    const referenced = pipe(
      found,
      Arr.flatMap((declaration) => referencedOf(declaration)),
      Arr.filter((declaration) => uriOf(declaration).toString() !== home),
    );
    const grown = Arr.fromIterable(new Set(Arr.appendAll(found, referenced)));
    if (grown.length === found.length) {
      return found;
    }
    return closureOf(home)(grown);
  };

const namesakesOf: From<Declaration, readonly Declaration[]> = (target) => {
  const root = AstUtils.getDocument(target).parseResult.value;
  if (!isSong(root) || !isNamed(target)) {
    return [target];
  }
  return pipe(
    root.declarations,
    Arr.filter((declaration) => isNamed(declaration) && declaration.name === target.name),
  );
};

const importedDeclarationsOf: From<SongNode, readonly Declaration[]> = (song) =>
  closureOf(uriOf(song).toString())(
    pipe(
      song.imports,
      Arr.flatMap((node) => node.symbols),
      Arr.flatMap((symbol) => Option.toArray(Option.fromNullishOr(symbol.target.ref))),
      Arr.filter((target) => isDeclaration(target)),
      Arr.flatMap((target) => namesakesOf(target)),
    ),
  );

const effectWith: From<From<string, string>, From<Effect, Effect>> = (fix) => (effect) => {
  if (effect.kind === "plugin") {
    return { ...effect, module: fix(effect.module) };
  }
  if (effect.kind === "reverb") {
    return {
      ...effect,
      left: fix(effect.left),
      right: pipe(
        effect.right,
        Option.map((path) => fix(path)),
      ),
    };
  }
  return effect;
};

const effectsWith: From<From<string, string>, From<readonly Effect[], readonly Effect[]>> =
  (fix) => (fx) =>
    pipe(
      fx,
      Arr.map((effect) => effectWith(fix)(effect)),
    );

type Source = Shared["instruments"][number]["source"];

const sourceWith: From<From<string, string>, From<Source, Source>> = (fix) => (source) => {
  if (source.kind === "plugin") {
    return { ...source, module: fix(source.module) };
  }
  return {
    ...source,
    zones: pipe(
      source.zones,
      Arr.map((zone) => ({ ...zone, path: fix(zone.path) })),
    ),
  };
};

const rebased: From<From<string, string>, From<Shared, Shared>> = (fix) => (shared) => {
  const effects = effectsWith(fix);
  return {
    samples: pipe(
      shared.samples,
      Arr.map((sample) => ({ ...sample, path: fix(sample.path) })),
    ),
    kits: pipe(
      shared.kits,
      Arr.map((kit) => ({
        ...kit,
        voices: pipe(
          kit.voices,
          Arr.map((voice) =>
            Option.match(voice.plugin, {
              onNone: () => ({ ...voice, path: fix(voice.path) }),
              onSome: (use) => ({
                ...voice,
                plugin: Option.some({ ...use, module: fix(use.module) }),
              }),
            }),
          ),
        ),
      })),
    ),
    instruments: pipe(
      shared.instruments,
      Arr.map((instrument) => ({ ...instrument, source: sourceWith(fix)(instrument.source) })),
    ),
    buses: pipe(
      shared.buses,
      Arr.map((bus) => ({ ...bus, fx: effects(bus.fx) })),
    ),
    tracks: pipe(
      shared.tracks,
      Arr.map((track) => ({ ...track, fx: effects(track.fx) })),
    ),
    plugins: pipe(
      shared.plugins,
      Arr.map((plugin) => ({ ...plugin, module: fix(plugin.module) })),
    ),
  };
};

const joined: From<readonly Shared[], Shared> = (parts) => ({
  samples: pipe(
    parts,
    Arr.flatMap((part) => part.samples),
  ),
  kits: pipe(
    parts,
    Arr.flatMap((part) => part.kits),
  ),
  instruments: pipe(
    parts,
    Arr.flatMap((part) => part.instruments),
  ),
  buses: pipe(
    parts,
    Arr.flatMap((part) => part.buses),
  ),
  tracks: pipe(
    parts,
    Arr.flatMap((part) => part.tracks),
  ),
  plugins: pipe(
    parts,
    Arr.flatMap((part) => part.plugins),
  ),
});

export const importedOf: From<SongNode, Shared> = (song) => {
  const home = uriOf(song);
  const byModule = Arr.groupBy(importedDeclarationsOf(song), (node) => uriOf(node).toString());
  const moduleOf: From<Arr.NonEmptyReadonlyArray<Declaration>, Shared> = (nodes) => {
    const fix = pathFrom(home)(uriOf(Arr.headNonEmpty(nodes)));
    return rebased(fix)(declarationsOf(nodes).value);
  };
  return joined(
    pipe(
      Rec.values(byModule),
      Arr.map((nodes) => moduleOf(nodes)),
    ),
  );
};

export const withImported: From<Shared, From<Declarations, Declarations>> =
  (imported) => (local) => ({
    ...local,
    ...joined([imported, local]),
  });

const nameKeyOf: From<Declaration, Option.Option<string>> = (node) =>
  pipe(
    Option.liftPredicate(node, isNamed),
    Option.map((named) => `${namespaceOf(named)}:${named.name}`),
  );

export const clashProblemsOf: From<SongNode, readonly Problem[]> = (song) => {
  const imported = new Set(
    pipe(
      importedDeclarationsOf(song),
      Arr.flatMap((node) => Option.toArray(nameKeyOf(node))),
    ),
  );
  return pipe(
    song.declarations,
    Arr.filter(isNamed),
    Arr.filter((node) => imported.has(`${namespaceOf(node)}:${node.name}`)),
    Arr.map((node) => problemAt(node)("name")(`${node.name} は import した名前と重なっています`)),
  );
};

export const missingProblemsOf =
  (exists: From<URI, boolean>): From<SongNode, readonly Problem[]> =>
  (song) =>
    pipe(
      song.imports,
      Arr.filter((node) => !exists(importedUriOf(node))),
      Arr.map((node) => problemAt(node)("path")(`${node.path} というファイルがありません`)),
    );
