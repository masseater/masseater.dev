import { Array as Arr, Effect, Option, Record as Rec, String as Str, pipe } from "effect";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import { wantedLockfile } from "./locked-packages.ts";

const LINK = "link:";

export interface WorkspaceLink {
  readonly from: string;
  readonly to: string;
}

type References = Readonly<Record<string, string>> | undefined;

interface LinkSections {
  readonly dependencies?: References;
  readonly devDependencies?: References;
  readonly optionalDependencies?: References;
}

const linkedPaths = (project: LinkSections): readonly string[] =>
  pipe(
    [project.dependencies, project.devDependencies, project.optionalDependencies],
    Arr.flatMap((resolved) => Rec.values(resolved ?? {})),
    Arr.filter(Str.startsWith(LINK)),
    Arr.map((reference) => Str.slice(LINK.length)(reference)),
  );

/** @internal */
export const workspaceLinks = Effect.fn("workspaceLinks")(function* workspaceLinks(root: string) {
  const files = yield* RepositoryFiles;
  const lockfile = yield* wantedLockfile(root);
  const linksOf = (id: string, project: LinkSections): readonly WorkspaceLink[] => {
    const from = files.relative(root, files.join(root, id));
    return pipe(
      linkedPaths(project),
      Arr.map((path): WorkspaceLink => ({
        from,
        to: files.relative(root, files.join(root, id, path)),
      })),
    );
  };
  return pipe(
    lockfile,
    Option.map(({ importers }) =>
      pipe(
        Rec.toEntries(importers),
        Arr.flatMap(([id, project]) => linksOf(id, project)),
      ),
    ),
    Option.getOrElse((): readonly WorkspaceLink[] => []),
  );
});
