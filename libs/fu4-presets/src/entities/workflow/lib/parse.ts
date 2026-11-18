import type { Source, YamlNode } from "@r_masseater/fu4";
import { Array as Arr, Option, Predicate, String as Str, pipe } from "effect";

import type { Workflow } from "#/entities/workflow/model/job-types.ts";

import { foldEntries, rejecting, setters } from "./fold.ts";
import { parseJob } from "./job.ts";
import { entryRecord, parseSection } from "./mapping.ts";
import { parseEvents } from "./on.ts";
import { parseString } from "./scalar.ts";
import { parseConcurrency, parseDefaults, parseEnv, parsePermissions } from "./sections.ts";
import type { Sink } from "./sink.ts";

const WORKFLOW_KEYS = [
  "name",
  "run-name",
  "on",
  "permissions",
  "env",
  "defaults",
  "concurrency",
  "jobs",
];
const FIRST = 1;

export const EMPTY_WORKFLOW: Workflow = {};

const parseRoot =
  (sink: Sink) =>
  (root: YamlNode): Workflow => {
    const { set, setSome } = setters<Workflow>();
    const workflow = foldEntries<Workflow>({
      entries: parseSection(sink)({
        section: "workflow",
        node: root,
        allowEmpty: false,
        caseSensitive: true,
      }),
      initial: EMPTY_WORKFLOW,
      handlers: [
        ["name", set("name", (entry) => parseString(sink)(entry.value, true))],
        ["on", setSome("on", (entry) => parseEvents(sink)(entry.value))],
        ["permissions", set("permissions", (entry) => parsePermissions(sink)(entry.value))],
        ["env", set("env", (entry) => parseEnv(sink)(entry.value))],
        ["defaults", set("defaults", (entry) => parseDefaults(sink)(entry.value))],
        [
          "concurrency",
          set("concurrency", (entry) => parseConcurrency(sink)(entry.key, entry.value)),
        ],
        [
          "jobs",
          set("jobs", (entry) =>
            entryRecord((job) => parseJob(sink)(job.key, job.value))(
              parseSection(sink)({
                section: "jobs",
                node: entry.value,
                allowEmpty: false,
                caseSensitive: false,
              }),
            ),
          ),
        ],
        ["run-name", set("runName", (entry) => parseString(sink)(entry.value, false))],
      ],
      unknown: rejecting({ sink, section: "workflow", expected: WORKFLOW_KEYS }),
    });
    if (Predicate.isUndefined(workflow.on)) {
      sink.error(root, '"on" section is missing in workflow');
    }
    if (Predicate.isUndefined(workflow.jobs)) {
      sink.error(root, '"jobs" section is missing in workflow');
    }
    return workflow;
  };

export const parseWorkflow =
  (sink: Sink) =>
  (source: Source): Option.Option<Workflow> => {
    for (const problem of source.errors) {
      sink.error(problem, problem.message);
    }
    const root = Option.fromNullishOr(source.yaml);
    if (Option.isSome(root)) {
      return Option.some(parseRoot(sink)(root.value));
    }
    if (
      pipe(
        source.errors,
        Arr.some((problem) => Str.startsWith("could not parse")(problem.message)),
      )
    ) {
      return Option.none();
    }
    sink.error({ line: FIRST, column: FIRST }, "workflow is empty");
    return Option.some(EMPTY_WORKFLOW);
  };
