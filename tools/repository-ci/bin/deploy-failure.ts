#!/usr/bin/env node
import { getJson, patch, post } from "@masseater.dev/github-workflow";
import { runMain } from "@masseater.dev/node-main";
import {
  Array as Arr,
  Config,
  Effect,
  Option,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";

const LABEL = "deploy-failure";
const TITLE = "main のデプロイが失敗した";
const COLOR = "B60205";
const FAILURE = "failure";
const SUCCESS = "success";
const JOB_LINE = /^- `(?<job>[^`]+)`$/u;

const Result = Schema.Struct({ result: Schema.String });

const Needs = Schema.fromJsonString(Schema.Record(Schema.String, Result));

const Numbered = Schema.Struct({ number: Schema.Int });

const Issue = Schema.Struct({ body: Schema.NullOr(Schema.String) });

const Comment = Schema.Struct({ body: Schema.String });

const Named = Schema.Struct({ name: Schema.String });

type Results = typeof Needs.Type;

const runLines = Effect.gen(function* runLines() {
  const url = yield* Config.String("RUN_URL");
  const sha = yield* Config.String("GITHUB_SHA");
  return `- 実行: ${url}\n- コミット: ${sha}\n`;
});

const openIssue = getJson(Schema.Array(Numbered))(
  `issues?labels=${LABEL}&state=open&per_page=1`,
).pipe(Effect.map((issues) => Option.map(Arr.head(issues), ({ number }) => number)));

const ensureLabel = Effect.gen(function* ensureLabel() {
  const labels = yield* getJson(Schema.Array(Named))("labels?per_page=100");
  const exists = pipe(
    labels,
    Arr.some(({ name }) => name === LABEL),
  );
  if (!exists) {
    yield* post({ path: "labels", body: { name: LABEL, color: COLOR, description: TITLE } });
  }
});

const report = Effect.fn("report")(function* report(
  failed: readonly string[],
  number: Option.Option<number>,
) {
  const lines = yield* runLines;
  const jobs = pipe(
    failed,
    Arr.map((job) => `- \`${job}\``),
    Arr.join("\n"),
  );
  const body = `main の verify で、次のジョブが失敗した。\n\n${jobs}\n\n${lines}`;
  const owner = yield* Config.String("GITHUB_REPOSITORY_OWNER");
  yield* ensureLabel;
  yield* Option.match(number, {
    onNone: () =>
      post({ path: "issues", body: { title: TITLE, labels: [LABEL], assignees: [owner], body } }),
    onSome: (open) => post({ path: `issues/${String(open)}/comments`, body: { body } }),
  });
});

const jobOf = (line: string): Option.Option<string> =>
  pipe(
    Str.match(JOB_LINE)(line),
    Option.flatMap((match) => Option.fromNullishOr(match.groups)),
    Option.flatMap(Rec.get("job")),
  );

const reportedJobs = Effect.fn("reportedJobs")(function* reportedJobs(number: number) {
  const issue = yield* getJson(Issue)(`issues/${String(number)}`);
  const comments = yield* getJson(Schema.Array(Comment))(
    `issues/${String(number)}/comments?per_page=100`,
  );
  const bodies = pipe(
    comments,
    Arr.map(({ body }) => body),
  );
  return pipe(
    [issue.body ?? "", ...bodies],
    Arr.flatMap(Str.split("\n")),
    Arr.flatMap((line) => Option.toArray(jobOf(line))),
    Arr.dedupe,
  );
});

const stillFailing =
  (results: Results) =>
  (job: string): boolean =>
    Option.exists(Rec.get(results, job), ({ result }) => result !== SUCCESS);

const closeIfPassed = Effect.fn("closeIfPassed")(function* closeIfPassed(
  results: Results,
  number: number,
) {
  const reported = yield* reportedJobs(number);
  if (pipe(reported, Arr.some(stillFailing(results)))) {
    return;
  }
  const lines = yield* runLines;
  yield* post({
    path: `issues/${String(number)}/comments`,
    body: { body: `失敗したジョブがすべて main で通った。\n\n${lines}` },
  });
  yield* patch({
    path: `issues/${String(number)}`,
    body: { state: "closed", state_reason: "completed" },
  });
});

const deployFailure = Effect.gen(function* deployFailure() {
  const needs = yield* Config.String("NEEDS");
  const results = yield* Schema.decodeEffect(Needs)(needs);
  const failed = pipe(
    Rec.toEntries(results),
    Arr.filter(([, { result }]) => result === FAILURE),
    Arr.map(([job]) => job),
  );
  const number = yield* openIssue;
  if (Arr.isReadonlyArrayNonEmpty(failed)) {
    yield* report(failed, number);
  } else if (Option.isSome(number)) {
    yield* closeIfPassed(results, number.value);
  }
});

runMain("deploy-failure")(deployFailure);
