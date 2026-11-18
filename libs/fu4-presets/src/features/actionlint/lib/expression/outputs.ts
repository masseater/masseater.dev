import type { Project } from "@r_masseater/fu4";
import { Array as Arr, Option, Record as Rec, Result, String as Str, pipe } from "effect";

import { findAction, popular } from "#/entities/action/index.ts";
import type { ActionMetadata } from "#/entities/action/index.ts";
import { STRING, loose, mapOf, strict } from "#/entities/expression/index.ts";
import type { ObjectType } from "#/entities/expression/index.ts";
import { findReusable } from "#/entities/workflow/index.ts";
import type { Job, Workflow } from "#/entities/workflow/model/job-types.ts";
import { localPath } from "#/shared/uses/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

import type { ExprEnv } from "./env.ts";

export const GITHUB_SCRIPT = "actions/github-script@";

const stringMap = (): ObjectType => mapOf(STRING);

const stringEntry = (name: string): readonly [string, typeof STRING] => [name, STRING];

const stringProps = (names: readonly string[]): ObjectType => {
  const entries = pipe(names, Arr.map(stringEntry));
  return strict(Rec.fromEntries(entries));
};

const actionOutputs = (metadata: ActionMetadata): ObjectType => {
  if (metadata.skipOutputs) {
    return loose();
  }
  return stringProps(pipe(Rec.keys(metadata.outputs), Arr.map(Str.toLowerCase)));
};

export const reusableOutputs =
  (env: ExprEnv) =>
  (project: Project) =>
  (uses: Option.Option<Text>): ObjectType => {
    const found = pipe(
      uses,
      Option.flatMap((text) =>
        Option.map(findReusable(project)(text.value), (result) => ({ text, result })),
      ),
    );
    return Option.match(found, {
      onNone: stringMap,
      onSome: ({ text, result }) =>
        Result.match(result, {
          onFailure: (message) => {
            env.fail(text, message);
            return stringMap();
          },
          onSuccess: (metadata) => stringProps(Rec.keys(metadata.outputs)),
        }),
    });
  };

const localOutputs = (env: ExprEnv, project: Project, uses: Text): ObjectType =>
  Option.match(findAction(project)(uses.value), {
    onNone: stringMap,
    onSome: (result) =>
      Result.match(result, {
        onFailure: (message) => {
          env.fail(uses, message);
          return stringMap();
        },
        onSuccess: (found) => actionOutputs(found.metadata),
      }),
  });

export const actionOutputsOf =
  (env: ExprEnv) =>
  (project: Project) =>
  (uses: Option.Option<Text>): ObjectType =>
    Option.match(uses, {
      onNone: stringMap,
      onSome: (text) => {
        if (Option.isSome(localPath(text.value))) {
          return localOutputs(env, project, text);
        }
        if (Str.startsWith(GITHUB_SCRIPT)(text.value)) {
          return loose();
        }
        return Option.match(popular(text.value), { onNone: stringMap, onSome: actionOutputs });
      },
    });

export type JobInfo =
  | { readonly type: "steps"; readonly outputs: readonly string[] }
  | { readonly type: "call"; readonly uses: Option.Option<Text> };

export const jobInfos = (workflow: Workflow): Readonly<Record<string, JobInfo>> =>
  pipe(
    workflow.jobs ?? {},
    Rec.map((job): JobInfo =>
      Option.match(Option.fromNullishOr(job.workflowCall), {
        onNone: () => ({ type: "steps", outputs: Rec.keys(job.outputs) }),
        onSome: (call) => ({ type: "call", uses: Option.fromNullishOr(call.uses) }),
      }),
    ),
  );

const outputsOf = (env: ExprEnv, project: Project, info: JobInfo): ObjectType => {
  if (info.type === "steps") {
    return stringProps(info.outputs);
  }
  return reusableOutputs(env)(project)(info.uses);
};

export const needsType =
  (env: ExprEnv) =>
  (project: Project) =>
  (job: Job, infos: Readonly<Record<string, JobInfo>>): ObjectType => {
    let props: Readonly<Record<string, ObjectType>> = {};
    for (const need of job.needs) {
      const id = Str.toLowerCase(need.value);
      const info = Rec.get(infos, id);
      if (id !== job.id.value && !Rec.has(props, id) && Option.isSome(info)) {
        const outputs = outputsOf(env, project, info.value);
        props = Rec.set(props, id, strict({ outputs, result: STRING }));
      }
    }
    return strict(props);
  };
