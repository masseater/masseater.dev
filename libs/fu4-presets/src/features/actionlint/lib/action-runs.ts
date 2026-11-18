import type { Project } from "@r_masseater/fu4";
import { Array as Arr, Option, Order, String as Str, pipe } from "effect";

import { cleanJoin, joinPath } from "#/entities/action/index.ts";
import type { ActionRuns, LocalAction } from "#/entities/action/index.ts";
import type { Fail } from "#/features/actionlint/lib/workflow-rule.ts";
import data from "#/shared/data/action.json" with { type: "json" };
import { quote } from "#/shared/text/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

export const DOCS =
  "https://docs.github.com/en/actions/creating-actions/metadata-syntax-for-github-actions";

const RUNTIMES: readonly string[] = data.runtimes;
const REGISTRIES: readonly string[] = [
  "docker://",
  "gcr.io/",
  "pkg.dev/",
  "ghcr.io/",
  "docker.io/",
];
const DOCKERFILE = "Dockerfile";

type Prop = keyof ActionRuns;

const PROPS: readonly (readonly [string, Prop])[] = [
  ["main", "main"],
  ["pre", "pre"],
  ["pre-if", "preIf"],
  ["post", "post"],
  ["post-if", "postIf"],
  ["steps", "steps"],
  ["image", "image"],
  ["pre-entrypoint", "preEntrypoint"],
  ["entrypoint", "entrypoint"],
  ["post-entrypoint", "postEntrypoint"],
  ["args", "args"],
  ["env", "env"],
];

const DOCKER_INVALID: readonly string[] = ["main", "pre", "pre-if", "post", "post-if", "steps"];
const COMPOSITE_INVALID: readonly string[] = [
  "main",
  "pre",
  "pre-if",
  "post",
  "post-if",
  "image",
  "pre-entrypoint",
  "entrypoint",
  "post-entrypoint",
  "args",
  "env",
];
const JAVASCRIPT_INVALID: readonly string[] = [
  "steps",
  "image",
  "pre-entrypoint",
  "entrypoint",
  "post-entrypoint",
  "args",
  "env",
];

export interface Local {
  readonly fail: Fail;
  readonly project: Project;
  readonly action: LocalAction;
  readonly uses: Text;
}

const LAST = 1;
const NONE = 0;

const listed = (rest: readonly string[], last: string): string => {
  if (Arr.isReadonlyArrayEmpty(rest)) {
    return last;
  }
  return `${Arr.join(rest, ", ")}, and ${last}`;
};

export const runtimes = (): string => {
  const quoted = pipe(Arr.sort(["composite", "docker", ...RUNTIMES], Order.String), Arr.map(quote));
  return Option.match(Arr.last(quoted), {
    onNone: () => "",
    onSome: (last) => listed(Arr.dropRight(quoted, LAST), last),
  });
};

const isSet = (runs: ActionRuns, prop: Prop): boolean => {
  const value = runs[prop];
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return Str.isNonEmpty(value);
  }
  return Option.exists(value, (count) => count > NONE);
};

const name = (local: Local): string => quote(local.action.metadata.name);
const dir = (local: Local): string => quote(local.action.shown);

const missingProp = (local: Local, prop: string, kind: string): void => {
  local.fail(
    local.uses,
    `${quote(prop)} is required in "runs" section because ${name(local)} is a ${kind} action. the action is defined at ${dir(local)}`,
  );
};

const invalidProps = (local: Local, kind: string, props: readonly string[]): void => {
  const { runs } = local.action.metadata;
  for (const [prop, key] of PROPS) {
    if (Arr.contains(props, prop) && isSet(runs, key)) {
      local.fail(
        local.uses,
        `${quote(prop)} is not allowed in "runs" section because ${name(local)} is a ${kind} action. the action is defined at ${dir(local)}`,
      );
    }
  }
};

const fileExists = (local: Local, file: string, prop: string): void => {
  if (Str.isEmpty(file) || local.project.exists(cleanJoin(joinPath(local.action.dir)(file)))) {
    return;
  }
  local.fail(
    local.uses,
    `file ${quote(file)} does not exist in ${dir(local)}. it is specified at ${quote(prop)} key in "runs" section in ${name(local)} action`,
  );
};

const isOnRegistry = (image: string): boolean =>
  pipe(
    REGISTRIES,
    Arr.some((prefix) => Str.startsWith(prefix)(image)),
  );

const baseName = (path: string): string =>
  pipe(
    Str.split("/")(path),
    Arr.filter(Str.isNonEmpty),
    Arr.last,
    Option.getOrElse(() => ""),
  );

const checkImage = (local: Local, image: string): void => {
  if (Str.isEmpty(image)) {
    missingProp(local, "image", "Docker");
    return;
  }
  if (isOnRegistry(image)) {
    return;
  }
  fileExists(local, image, "image");
  if (baseName(image) !== DOCKERFILE) {
    local.fail(
      local.uses,
      `the local file ${quote(image)} referenced from "image" key must be named "Dockerfile" in ${name(local)} action. the action is defined at ${dir(local)}`,
    );
  }
};

const checkDocker = (local: Local): void => {
  const { runs } = local.action.metadata;
  checkImage(local, runs.image);
  fileExists(local, runs.preEntrypoint, "pre-entrypoint");
  fileExists(local, runs.entrypoint, "entrypoint");
  fileExists(local, runs.postEntrypoint, "post-entrypoint");
  invalidProps(local, "Docker", DOCKER_INVALID);
};

const checkComposite = (local: Local): void => {
  if (Option.isNone(local.action.metadata.runs.steps)) {
    missingProp(local, "steps", "Composite");
  }
  invalidProps(local, "Composite", COMPOSITE_INVALID);
};

const checkHook =
  (local: Local) =>
  (file: string, condition: string, prop: string): void => {
    fileExists(local, file, prop);
    if (Str.isEmpty(file) && Str.isNonEmpty(condition)) {
      local.fail(
        local.uses,
        `"${prop}" is required when "${prop}-if" is specified in "runs" section in ${name(local)} action. the action is defined at ${dir(local)}`,
      );
    }
  };

const checkJavaScript = (local: Local): void => {
  const { runs } = local.action.metadata;
  if (Str.isEmpty(runs.main)) {
    missingProp(local, "main", "JavaScript");
  } else {
    fileExists(local, runs.main, "main");
  }
  checkHook(local)(runs.pre, runs.preIf, "pre");
  checkHook(local)(runs.post, runs.postIf, "post");
  invalidProps(local, "JavaScript", JAVASCRIPT_INVALID);
};

const checkUnknownRunner = (local: Local, using: string): void => {
  local.fail(
    local.uses,
    `invalid runner name ${quote(using)} at runs.using in ${name(local)} action defined at ${dir(local)}. valid runners are ${runtimes()}. see ${DOCS}#runs`,
  );
  if (Str.startsWith("node")(using)) {
    checkJavaScript(local);
  }
};

export const checkRuns = (local: Local): void => {
  const { using } = local.action.metadata.runs;
  if (Str.isEmpty(using)) {
    local.fail(
      local.uses,
      `"runs.using" is missing in local action ${name(local)} defined at ${dir(local)}`,
    );
  } else if (using === "docker") {
    checkDocker(local);
  } else if (using === "composite") {
    checkComposite(local);
  } else if (Arr.contains(RUNTIMES, using)) {
    checkJavaScript(local);
  } else {
    checkUnknownRunner(local, using);
  }
};
