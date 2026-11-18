import type { Position, YamlNode } from "@r_masseater/fu4";
import { Predicate, Record as Rec } from "effect";

import type { Env, Job } from "#/entities/workflow/model/job-types.ts";
import type {
  Concurrency,
  Defaults,
  DefaultsRun,
  Environment,
  Permissions,
} from "#/entities/workflow/model/types.ts";
import { optional } from "#/shared/record/index.ts";

import { foldEntries, rejecting, setters } from "./fold.ts";
import { entryRecord, parseSection } from "./mapping.ts";
import type { Entry } from "./mapping.ts";
import { parseBool, parseExpression, parseString } from "./scalar.ts";
import { reportEmpty } from "./sequence.ts";
import type { Sink } from "./sink.ts";

const section =
  (sink: Sink) =>
  (name: string, node: YamlNode): readonly Entry[] =>
    parseSection(sink)({ section: name, node, allowEmpty: false, caseSensitive: true });

const caseless =
  (sink: Sink) =>
  (name: string, node: YamlNode): readonly Entry[] =>
    parseSection(sink)({ section: name, node, allowEmpty: false, caseSensitive: false });

const text =
  (sink: Sink) =>
  (entry: Entry): Permissions["scopes"][string]["value"] =>
    parseString(sink)(entry.value, false);

export const parsePermissions =
  (sink: Sink) =>
  (node: YamlNode): Permissions => {
    if (node.kind === "scalar") {
      return { all: parseString(sink)(node, false), scopes: {} };
    }
    const entries = parseSection(sink)({
      section: "permissions",
      node,
      allowEmpty: true,
      caseSensitive: false,
    });
    return {
      scopes: entryRecord((entry) => ({ name: entry.key, value: text(sink)(entry) }))(entries),
    };
  };

export const parseEnv =
  (sink: Sink) =>
  (node: YamlNode): Env => {
    if (node.kind === "scalar") {
      return {
        vars: {},
        ...optional("expression")(parseExpression(sink)(node, 'mapping value for "env" section')),
      };
    }
    return {
      vars: entryRecord((entry) => ({
        name: entry.key,
        value: parseString(sink)(entry.value, true),
      }))(caseless(sink)("env", node)),
    };
  };

const defaultsRun =
  (sink: Sink) =>
  (node: YamlNode): DefaultsRun => {
    const { set } = setters<DefaultsRun>();
    return foldEntries<DefaultsRun>({
      entries: section(sink)("run", node),
      initial: {},
      handlers: [
        ["shell", set("shell", text(sink))],
        ["working-directory", set("workingDirectory", text(sink))],
      ],
      unknown: rejecting({ sink, section: "run", expected: ["shell", "working-directory"] }),
    });
  };

export const parseDefaults =
  (sink: Sink) =>
  (node: YamlNode): Defaults => {
    const defaults = foldEntries<Defaults>({
      entries: section(sink)("defaults", node),
      initial: {},
      handlers: [
        ["run", setters<Defaults>().set("run", (entry) => defaultsRun(sink)(entry.value))],
      ],
      unknown: rejecting({ sink, section: "defaults", expected: ["run"] }),
    });
    if (Predicate.isUndefined(defaults.run)) {
      sink.error(node, '"defaults" section should have "run" section');
    }
    return defaults;
  };

export const parseConcurrency =
  (sink: Sink) =>
  (at: Position, node: YamlNode): Concurrency => {
    if (node.kind === "scalar") {
      return { group: parseString(sink)(node, false) };
    }
    const { set, setSome } = setters<Concurrency>();
    const concurrency = foldEntries<Concurrency>({
      entries: section(sink)("concurrency", node),
      initial: {},
      handlers: [
        ["group", set("group", text(sink))],
        [
          "cancel-in-progress",
          setSome("cancelInProgress", (entry) => parseBool(sink)(entry.value)),
        ],
      ],
      unknown: rejecting({
        sink,
        section: "concurrency",
        expected: ["group", "cancel-in-progress"],
      }),
    });
    if (Predicate.isUndefined(concurrency.group)) {
      sink.error(at, 'group name is missing in "concurrency" section');
    }
    return concurrency;
  };

export const parseEnvironment =
  (sink: Sink) =>
  (at: Position, node: YamlNode): Environment => {
    if (node.kind === "scalar") {
      return { name: parseString(sink)(node, false) };
    }
    const { set, setSome } = setters<Environment>();
    const environment = foldEntries<Environment>({
      entries: section(sink)("environment", node),
      initial: {},
      handlers: [
        ["name", set("name", text(sink))],
        ["url", set("url", text(sink))],
        ["deployment", setSome("deployment", (entry) => parseBool(sink)(entry.value))],
      ],
      unknown: rejecting({ sink, section: "environment", expected: ["deployment", "name", "url"] }),
    });
    if (Predicate.isUndefined(environment.name)) {
      sink.error(at, 'name is missing in "environment" section');
    }
    return environment;
  };

export const parseOutputs =
  (sink: Sink) =>
  (node: YamlNode): Job["outputs"] => {
    const outputs = entryRecord((entry) => parseString(sink)(entry.value, true))(
      caseless(sink)("outputs", node),
    );
    if (Rec.isEmptyRecord(outputs)) {
      reportEmpty(sink)("outputs", node);
    }
    return outputs;
  };
