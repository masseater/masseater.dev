import { Array as Arr, Option, String as Str, pipe } from "effect";

import {
  SEPARATOR,
  closureOf,
  directoryOf,
  isLocal,
  isWithin,
  relativeTo,
} from "./cargo-metadata.ts";
import type { CargoMetadata, CargoPackage, CargoWorkspace } from "./cargo-metadata.ts";

const NEGATION = "!";
const CONTENTS = "/**";
const ANYWHERE = "**/";
const CLOSURE_DIRECTORY = "node_modules/.cache/msch/cargo-inputs";
const CLOSURE_SUFFIX = ".lock";
const ROOT_SLUG = "root";
const SLUG_SEPARATOR = "__";
const LINE = "\n";
const WORKSPACE_FILES = ["Cargo.toml", "rust-toolchain.toml", ".cargo/**"] as const;
const GENERATED = ["node_modules", "dist"] as const;

export type CargoInput =
  | { readonly pattern: string; readonly base: "workspace" }
  | { readonly auto: true };

export interface DerivedInputs {
  readonly inputs: readonly CargoInput[];
  readonly closureFile: string;
  readonly closure: string;
}

export interface CargoInputRequest {
  readonly workspace: CargoWorkspace;
  readonly directory: string;
  readonly extras: readonly string[];
}

const workspaceInput = (pattern: string): CargoInput => ({ pattern, base: "workspace" });

const withoutContents = Str.replace(CONTENTS, "");

const slugOf = (owner: string): string =>
  Option.match(Option.liftPredicate(owner, Str.isNonEmpty), {
    onNone: () => ROOT_SLUG,
    onSome: Str.replaceAll(SEPARATOR, SLUG_SEPARATOR),
  });

const ownedRoots = (metadata: CargoMetadata, owner: string): readonly string[] => {
  const relative = relativeTo(metadata.workspace_root);
  const owned = new Set(
    pipe(
      metadata.packages,
      Arr.filter((entry) =>
        pipe(relative(directoryOf(entry.manifest_path)), Option.exists(isWithin(owner))),
      ),
      Arr.map((entry) => entry.id),
    ),
  );
  return pipe(
    metadata.workspace_members,
    Arr.filter((id) => owned.has(id)),
  );
};

const scopedExtra =
  (owner: string) =>
  (extra: string): string => {
    if (Str.startsWith(NEGATION)(extra)) {
      return `${NEGATION}${owner}${SEPARATOR}${Str.slice(NEGATION.length)(extra)}`;
    }
    return `${owner}${SEPARATOR}${extra}`;
  };

const excludedFrom = (
  workspace: CargoWorkspace,
  walked: readonly string[],
  kept: readonly string[],
): readonly CargoInput[] =>
  pipe(
    workspace.ignored,
    Arr.filter(({ pattern }) => {
      const covered = withoutContents(Str.slice(NEGATION.length)(pattern));
      const applies =
        Str.startsWith(ANYWHERE)(covered) ||
        pipe(
          walked,
          Arr.some((dir) => isWithin(dir)(covered)),
        );
      return applies && !pipe(kept, Arr.some(isWithin(covered)));
    }),
  );

const generatedIn = (walked: readonly string[]): readonly string[] =>
  pipe(
    walked,
    Arr.flatMap((dir) =>
      pipe(
        GENERATED,
        Arr.map((name) => `${NEGATION}${dir}${SEPARATOR}${ANYWHERE}${name}${CONTENTS}`),
      ),
    ),
  );

const externalIds = (closure: readonly CargoPackage[]): readonly string[] =>
  pipe(
    closure,
    Arr.filter((entry) => !isLocal(entry)),
    Arr.map((entry) => entry.id),
  );

/** @internal */
export const cargoInputsOf = ({
  workspace,
  directory,
  extras,
}: CargoInputRequest): DerivedInputs => {
  const { metadata } = workspace;
  const relative = relativeTo(metadata.workspace_root);
  const owner = Option.getOrElse(relative(directory), () => "");
  const closure = closureOf(metadata)(ownedRoots(metadata, owner));
  const walked = Arr.sort(
    pipe(
      closure,
      Arr.filter(isLocal),
      Arr.flatMap((entry) => Option.toArray(relative(directoryOf(entry.manifest_path)))),
    ),
    Str.Order,
  );
  const added = pipe(extras, Arr.map(scopedExtra(owner)));
  const kept = pipe(
    added,
    Arr.filter((extra) => !Str.startsWith(NEGATION)(extra)),
    Arr.map(withoutContents),
  );
  const closureFile = `${CLOSURE_DIRECTORY}${SEPARATOR}${slugOf(owner)}${CLOSURE_SUFFIX}`;
  return {
    inputs: [
      ...pipe(
        walked,
        Arr.map((dir) => workspaceInput(`${dir}${CONTENTS}`)),
      ),
      workspaceInput(closureFile),
      ...pipe(WORKSPACE_FILES, Arr.map(workspaceInput)),
      ...excludedFrom(workspace, walked, kept),
      ...pipe(generatedIn(walked), Arr.map(workspaceInput)),
      ...pipe(added, Arr.map(workspaceInput)),
    ],
    closureFile,
    closure: Arr.join(Arr.sort(externalIds(closure), Str.Order), LINE),
  };
};
