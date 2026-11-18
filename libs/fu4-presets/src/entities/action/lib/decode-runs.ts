import type { YamlNode } from "@r_masseater/fu4";
import { Option, pipe } from "effect";

import { EMPTY_RUNS } from "#/entities/action/model/types.ts";
import type { ActionRuns, Branding } from "#/entities/action/model/types.ts";
import { decodeString, isPresent, valueAt } from "#/shared/yaml/index.ts";
import type { Sink } from "#/shared/yaml/index.ts";

const ANY_LIST = "[]interface {}";

const stringAt =
  (sink: Sink, node: YamlNode) =>
  (key: string): string =>
    pipe(
      valueAt(key)(node),
      Option.map(decodeString(sink)),
      Option.getOrElse(() => ""),
    );

const stepsOf = (sink: Sink, node: YamlNode): Option.Option<number> =>
  pipe(
    valueAt("steps")(node),
    Option.filter((steps) => isPresent(sink)(steps, "sequence", ANY_LIST)),
    Option.map((steps) => steps.children.length),
  );

const presentAt = (sink: Sink, node: YamlNode, key: "args" | "env"): boolean => {
  const expected = {
    args: ["sequence", ANY_LIST],
    env: ["mapping", "map[string]interface {}"],
  } as const;
  const [kind, target] = expected[key];
  return Option.exists(valueAt(key)(node), (value) => isPresent(sink)(value, kind, target));
};

export const decodeRuns =
  (sink: Sink) =>
  (node: YamlNode): ActionRuns => {
    if (!isPresent(sink)(node, "mapping", "actionlint.ActionMetadataRuns")) {
      return EMPTY_RUNS;
    }
    const text = stringAt(sink, node);
    return {
      using: text("using"),
      main: text("main"),
      pre: text("pre"),
      preIf: text("pre-if"),
      post: text("post"),
      postIf: text("post-if"),
      image: text("image"),
      preEntrypoint: text("pre-entrypoint"),
      entrypoint: text("entrypoint"),
      postEntrypoint: text("post-entrypoint"),
      steps: stepsOf(sink, node),
      args: presentAt(sink, node, "args"),
      env: presentAt(sink, node, "env"),
    };
  };

export const decodeBranding =
  (sink: Sink) =>
  (node: YamlNode): Branding => {
    if (!isPresent(sink)(node, "mapping", "actionlint.ActionMetadataBranding")) {
      return { icon: "", color: "" };
    }
    const text = stringAt(sink, node);
    return { icon: text("icon"), color: text("color") };
  };
