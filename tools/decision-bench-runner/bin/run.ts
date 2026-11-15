import { LabelStatsSchema, SummarySchema } from "bench-summary/schema";
import type { Summary, Support } from "bench-summary/schema";
import { DateTime, Effect, Number as Num, Schema, pipe, Array as Arr } from "effect";

import { DetailSchema, reusePrior } from "#/detail.ts";
import { ItemSchema } from "#/item.ts";
import type { Item, Scored } from "#/item.ts";
import { makeOpenRouterAdapter } from "#/openrouter.ts";
import type { DecisionAdapter } from "#/openrouter.ts";
import { runBench } from "#/runtime.ts";
import { metric, usage } from "#/score.ts";
import { benchPath, dataPath, modelSlug, readJsonl, readText, writeJson } from "#/store.ts";

const CONCURRENCY = 4;

const TASKS = [
  { id: "jnli", label: "JNLI 含意関係", format: "choice", metric: "macro-f1" },
  { id: "rules", label: "業務ルール判定", format: "noul", metric: "balanced-accuracy" },
] as const;

const MODELS = [
  { provider: "openrouter", id: "typesafe/jev-1.13", label: "Jev 1.13", choiceVia: "choice" },
  { provider: "openrouter", id: "respan/span-01-lite", label: "span-01 lite", choiceVia: "noul" },
  { provider: "openrouter", id: "respan/span-01", label: "span-01", choiceVia: "noul" },
  { provider: "openrouter", id: "liquid/d1", label: "Liquid d1", choiceVia: "choice" },
  {
    provider: "openrouter",
    id: "microsoft/microsoft-decision-1",
    label: "Microsoft-Decision-1",
    choiceVia: "choice",
  },
  { provider: "openrouter", id: "nace-ai/drex-v1.5", label: "Drex v1.5", choiceVia: "choice" },
  { provider: "openrouter", id: "cloudflare/clef", label: "Clef", choiceVia: "choice" },
  { provider: "openrouter", id: "cloudflare/clef-omni", label: "Clef Omni", choiceVia: "choice" },
  { provider: "openrouter", id: "cloudflare/clef-flash", label: "Clef Flash", choiceVia: "choice" },
  {
    provider: "openrouter",
    id: "upstage/solar-decide",
    label: "Solar Decide",
    choiceVia: "choice",
  },
  {
    provider: "openrouter",
    id: "upstage/solar-decide-flash",
    label: "Solar Decide Flash",
    choiceVia: "choice",
  },
  {
    provider: "openrouter",
    id: "perplexity/pplx-decider-v1.1-27b",
    label: "Decider V1.1 27B",
    choiceVia: "choice",
  },
  {
    provider: "openrouter",
    id: "openai/gpt-6-luna-decisions",
    label: "GPT-6 Luna Decisions",
    choiceVia: "choice",
  },
  {
    provider: "openrouter",
    id: "togethercomputer/tev1-4b-experimental",
    label: "Tev1 4B Experimental",
    choiceVia: "choice",
  },
  {
    provider: "openrouter",
    id: "inception/mercury-decide",
    label: "Mercury Decide",
    choiceVia: "choice",
  },
  { provider: "openrouter", id: "jaredpalmer/kev-4b", label: "Kev 4B", choiceVia: "choice" },
] as const;

type Task = (typeof TASKS)[number] & Readonly<{ items: readonly Item[] }>;

const supportOf = (test: Readonly<{ failed: number; total: number }>): Support => {
  if (test.failed === test.total) {
    return "unsupported";
  }
  return "supported";
};

const runTask = Effect.fn("runTask")(function* runTask(adapter: DecisionAdapter, task: Task) {
  const rows = yield* Effect.forEach(
    task.items,
    (item) => adapter.decide(item).pipe(Effect.map((outcome): Scored => ({ item, outcome }))),
    { concurrency: CONCURRENCY },
  );
  const test = metric(
    pipe(
      rows,
      Arr.filter(({ item }) => item.split === "test"),
    ),
  );
  const result = {
    task: task.id,
    label: task.label,
    format: task.format,
    metric: task.metric,
    support: supportOf(test),
    test,
    hard: metric(
      pipe(
        rows,
        Arr.filter(({ item }) => item.split === "hard"),
      ),
    ),
    ...usage(rows),
  };
  return { rows, result };
});

const runModel = Effect.fn("runModel")(function* runModel(
  model: (typeof MODELS)[number],
  tasks: readonly Task[],
) {
  const detailPath = yield* benchPath("results", `${modelSlug(model.id)}.json`);
  const openRouter = yield* makeOpenRouterAdapter(model.id, model.choiceVia);
  const adapter = yield* reusePrior(openRouter, detailPath);
  const ran = yield* Effect.forEach(tasks, (task) => runTask(adapter, task), { discard: false });
  const results = pipe(
    ran,
    Arr.map(({ result }) => result),
  );
  yield* writeJson(DetailSchema, detailPath, {
    model: model.id,
    outcomes: pipe(
      ran,
      Arr.flatMap(({ rows }) =>
        pipe(
          rows,
          Arr.map(({ item, outcome }) => ({ id: item.id, outcome })),
        ),
      ),
    ),
  });
  return {
    provider: model.provider,
    model: model.id,
    label: model.label,
    choiceVia: model.choiceVia,
    index:
      Num.sumAll(
        pipe(
          results,
          Arr.map(({ test }) => test.skill),
        ),
      ) / results.length,
    costUsd: Num.sumAll(
      pipe(
        results,
        Arr.map(({ costUsd }) => costUsd),
      ),
    ),
    tasks: results,
  };
});

const loadTask = Effect.fn("loadTask")(function* loadTask(task: (typeof TASKS)[number]) {
  const path = yield* dataPath({ task: task.id, extension: "jsonl" });
  const items = yield* readJsonl(ItemSchema, path);
  return { ...task, items };
});

const loadStats = Effect.fn("loadStats")(function* loadStats(task: (typeof TASKS)[number]) {
  const path = yield* dataPath({ task: task.id, extension: "stats.json" });
  const text = yield* readText(path);
  return yield* Schema.decodeEffect(Schema.fromJsonString(LabelStatsSchema))(text);
});

runBench(
  Effect.gen(function* runAll() {
    const tasks = yield* Effect.forEach(TASKS, (task) => loadTask(task), { discard: false });
    const now = yield* DateTime.now;
    const summary: Summary = {
      generatedAt: DateTime.formatIso(now),
      models: yield* Effect.forEach(MODELS, (model) => runModel(model, tasks), {
        concurrency: "unbounded",
      }),
      labeling: yield* Effect.forEach(TASKS, (task) => loadStats(task), { discard: false }),
    };
    const summaryPath = yield* benchPath("..", "..", "libs", "bench-summary", "summary.json");
    yield* writeJson(SummarySchema, summaryPath, summary);
  }),
);
