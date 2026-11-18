import type { Project } from "@r_masseater/fu4";
import { Option, Result, String as Str, pipe } from "effect";

import type { ReusableMetadata } from "#/entities/workflow/model/reusable.ts";
import { projectCache } from "#/shared/project-cache/index.ts";
import { quote } from "#/shared/text/index.ts";
import { localPath } from "#/shared/uses/index.ts";

import { containsExpression } from "./expression-text.ts";
import { reusableOf } from "./reusable.ts";

export type Found = Result.Result<ReusableMetadata, string>;

const reusables = projectCache<Option.Option<Found>>();

const unreadable = (spec: string, relative: string): Found =>
  Result.fail(
    `could not read reusable workflow file for ${quote(spec)}: open ${relative}: no such file or directory`,
  );

const load = (project: Project, spec: string, relative: string): Found =>
  Option.match(project.parse(relative), {
    onNone: () => unreadable(spec, relative),
    onSome: (source) =>
      Result.mapError(
        reusableOf(source),
        (message) =>
          `error while parsing reusable workflow ${quote(spec)}: ${Str.replaceAll("\n", " ")(message)}`,
      ),
  });

export const findReusable =
  (project: Project) =>
  (spec: string): Option.Option<Found> => {
    const relative = Option.filter(localPath(spec), () => !containsExpression(spec));
    if (Option.isNone(relative)) {
      return Option.none();
    }
    const hit = reusables.get(project)(spec);
    if (Option.isSome(hit)) {
      return hit.value;
    }
    const loaded = Option.some(load(project, spec, relative.value));
    reusables.set(project)(
      spec,
      pipe(
        loaded,
        Option.filter((found) => Result.isSuccess(found)),
      ),
    );
    return loaded;
  };

export const skipReusable =
  (project: Project) =>
  (spec: string): void => {
    reusables.set(project)(spec, Option.none());
  };
