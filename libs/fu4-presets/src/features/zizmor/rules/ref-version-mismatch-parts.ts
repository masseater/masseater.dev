import { Array as Arr, Option, Result, String as Str, pipe } from "effect";

import {
  annotated,
  concretize,
  primary,
  subfeatureLocation,
  withinText,
  withKeys,
} from "#/features/zizmor/lib/location.ts";
import type { UsesTarget } from "#/features/zizmor/lib/uses-targets.ts";
import { rawVersionOf } from "#/features/zizmor/lib/version.ts";
import type { Comment, Location, SymbolicLocation } from "#/features/zizmor/model/finding.ts";
import type { GitHubClient, ResolvedRef } from "#/features/zizmor/model/github.ts";
import { subfeatureOf } from "#/shared/subfeature/index.ts";

const SHORT = 12;
const START = 0;

export type CommentState =
  | { readonly type: "missing" }
  | { readonly type: "unrelated" }
  | { readonly type: "version"; readonly version: string; readonly comment: Comment };

export interface Pin {
  readonly target: UsesTarget;
  readonly client: GitHubClient;
  readonly slug: string;
  readonly commit: string;
}

const stateOf = (comments: readonly Comment[]): CommentState =>
  pipe(
    comments,
    Arr.findFirst((comment) =>
      Option.map(rawVersionOf(comment), (version): CommentState => ({
        type: "version",
        version,
        comment,
      })),
    ),
    Option.getOrElse((): CommentState => {
      if (Arr.isReadonlyArrayEmpty(comments)) {
        return { type: "missing" };
      }
      return { type: "unrelated" };
    }),
  );

export const usesLocation = (target: UsesTarget): SymbolicLocation =>
  pipe(target.location, withKeys("uses"));

export const commentState = (target: UsesTarget): Option.Option<CommentState> =>
  pipe(
    concretize(target.input.document)(usesLocation(target)),
    Result.getSuccess,
    Option.map(({ concrete }) => stateOf(concrete.comments)),
  );

export const flagged =
  (annotation: string) =>
  ({ target }: Pin): SymbolicLocation =>
    pipe(usesLocation(target), primary, withinText(target.raw), annotated(annotation));

export const suggested =
  (tag: string) =>
  (target: UsesTarget): SymbolicLocation =>
    pipe(usesLocation(target), withinText(target.raw), annotated(`is pointed to by tag ${tag}`));

const pointsTo = (found: Option.Option<ResolvedRef>): string =>
  Option.match(found, {
    onNone: () => "points to unknown ref",
    onSome: (ref) => `${ref.kind} points to commit ${Str.slice(START, SHORT)(ref.commit)}`,
  });

export interface VersionComment {
  readonly target: UsesTarget;
  readonly version: string;
  readonly comment: Comment;
}

export const commentLocation =
  ({ target, version, comment }: VersionComment) =>
  (found: Option.Option<ResolvedRef>): Location => {
    const symbolic = pipe(usesLocation(target), primary, annotated(pointsTo(found)));
    const within = subfeatureOf(comment.offset)(version);
    return subfeatureLocation(target.input.document)(symbolic, within);
  };
