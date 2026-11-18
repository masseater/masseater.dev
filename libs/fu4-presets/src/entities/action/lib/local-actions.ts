import type { Project } from "@r_masseater/fu4";
import { Array as Arr, Option, Result, String as Str, pipe } from "effect";

import type { ActionMetadata } from "#/entities/action/model/types.ts";
import { quote } from "#/shared/text/index.ts";
import { localPath } from "#/shared/uses/index.ts";

import { decodeAction } from "./decode.ts";

export interface LocalAction {
  readonly metadata: ActionMetadata;
  readonly dir: string;
  readonly shown: string;
  readonly file: string;
  readonly cached: boolean;
}

type Loaded = Option.Option<Result.Result<LocalAction, string>>;

const FILES: readonly string[] = ["action.yaml", "action.yml"];
const PARENT = "..";
const SKIPPED: readonly string[] = ["", "."];

const cache = new WeakMap<Project, Map<string, Option.Option<LocalAction>>>();

export const cleanJoin = (relative: string): string => {
  const parts: string[] = [];
  for (const part of Str.split("/")(relative)) {
    if (part === PARENT) {
      parts.pop();
    } else if (!Arr.contains(SKIPPED, part)) {
      parts.push(part);
    }
  }
  return Arr.join(parts, "/");
};

export const joinPath =
  (dir: string) =>
  (file: string): string => {
    if (Str.isEmpty(dir)) {
      return file;
    }
    return `${dir}/${file}`;
  };

const load = (project: Project, dir: string): Loaded => {
  const shown = joinPath(project.root)(dir);
  return pipe(
    FILES,
    Arr.findFirst((file) =>
      Option.map(project.parse(joinPath(dir)(file)), (source) => ({ source, file })),
    ),
    Option.map(({ source, file }) =>
      Result.mapBoth(decodeAction(source), {
        onFailure: (message) => `could not parse action metadata in ${quote(shown)}: ${message}`,
        onSuccess: (metadata): LocalAction => ({ metadata, dir, shown, file, cached: false }),
      }),
    ),
  );
};

const cacheOf = (project: Project): Map<string, Option.Option<LocalAction>> => {
  const found = Option.fromNullishOr(cache.get(project));
  if (Option.isSome(found)) {
    return found.value;
  }
  const created = new Map<string, Option.Option<LocalAction>>();
  cache.set(project, created);
  return created;
};

export const findAction =
  (project: Project) =>
  (spec: string): Loaded => {
    const relative = localPath(spec);
    if (Option.isNone(relative)) {
      return Option.none();
    }
    const entries = cacheOf(project);
    const hit = Option.fromNullishOr(entries.get(spec));
    if (Option.isSome(hit)) {
      return pipe(
        hit.value,
        Option.map((action) => Result.succeed({ ...action, cached: true })),
      );
    }
    const loaded = load(project, cleanJoin(relative.value));
    entries.set(spec, pipe(loaded, Option.flatMap(Result.getSuccess)));
    return loaded;
  };
