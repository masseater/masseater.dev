import { Effect, Option, pipe } from "effect";

import {
  at,
  atRaw,
  confidence,
  finding,
  persona,
  severity,
  tip,
} from "#/features/zizmor/lib/finding.ts";
import { longestTag, lookupRef } from "#/features/zizmor/lib/github-refs.ts";
import { hidden } from "#/features/zizmor/lib/location.ts";
import type { UsesTarget } from "#/features/zizmor/lib/uses-targets.ts";
import type { Drafts } from "#/features/zizmor/model/audit.ts";
import type { Comment, FindingDraft } from "#/features/zizmor/model/finding.ts";
import type { GitHubEffect, NamedRef, ResolvedRef } from "#/features/zizmor/model/github.ts";

import { commentLocation, flagged, suggested } from "./ref-version-mismatch-parts.ts";
import type { CommentState, Pin } from "./ref-version-mismatch-parts.ts";

export const meta = {
  ident: "ref-version-mismatch",
  desc: "action's hash pin has mismatched or missing version comment",
} as const;

interface Wording {
  readonly annotation: string;
  readonly advice: string;
}

const wording = (state: CommentState, tag: string): Wording => {
  if (state.type === "missing") {
    return { annotation: "missing version comment", advice: `add version comment '# ${tag}'` };
  }
  return {
    annotation: "comment does not contain a version",
    advice: `rewrite comment to include '# ${tag}'`,
  };
};

const missingVersion =
  (pin: Pin, state: CommentState) =>
  (tag: NamedRef): Drafts => {
    const { annotation, advice } = wording(state, tag.name);
    return [
      pipe(
        finding(meta),
        severity("low"),
        confidence("high"),
        persona("pedantic"),
        at(hidden(pin.target.location)),
        at(flagged(annotation)(pin)),
        tip(advice),
      ),
    ];
  };

const withoutVersion = (pin: Pin, state: CommentState): GitHubEffect<Drafts> =>
  Effect.map(longestTag(pin.client)(pin.target.ref)(pin.commit), (tag) =>
    Option.match(tag, {
      onNone: (): Drafts => [],
      onSome: missingVersion(pin, state),
    }),
  );

const withSuggestion =
  (target: UsesTarget) =>
  (draft: FindingDraft) =>
  (tag: Option.Option<NamedRef>): FindingDraft =>
    Option.match(tag, {
      onNone: () => draft,
      onSome: (found) => at(hidden(target.location), suggested(found.name)(target))(draft),
    });

const mismatch =
  (pin: Pin, version: string, comment: Comment) =>
  (found: Option.Option<ResolvedRef>): GitHubEffect<Drafts> => {
    const draft = pipe(
      finding(meta),
      severity("medium"),
      confidence("high"),
      at(hidden(pin.target.location)),
      atRaw(commentLocation({ target: pin.target, version, comment })(found)),
    );
    return Effect.map(longestTag(pin.client)(pin.target.ref)(pin.commit), (tag): Drafts => [
      withSuggestion(pin.target)(draft)(tag),
    ]);
  };

const withVersion = (pin: Pin, version: string, comment: Comment): GitHubEffect<Drafts> =>
  Effect.flatMap(lookupRef(pin.client)(pin.slug)(version), (found) => {
    if (Option.exists(found, (ref) => ref.commit === pin.commit)) {
      return Effect.succeed<Drafts>([]);
    }
    return mismatch(pin, version, comment)(found);
  });

export const audited =
  (pin: Pin) =>
  (state: CommentState): GitHubEffect<Drafts> => {
    if (state.type === "version") {
      return withVersion(pin, state.version, state.comment);
    }
    return withoutVersion(pin, state);
  };
