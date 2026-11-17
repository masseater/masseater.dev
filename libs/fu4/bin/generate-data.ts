import { NodeServices } from "@effect/platform-node";
import { runMain } from "@effect/platform-node/NodeRuntime";
import {
  Array as Arr,
  Effect,
  FileSystem,
  Path,
  Predicate,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";
import type { Root, Table, TableRow } from "mdast";
import { toString as textOf } from "mdast-util-to-string";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { parse as parseYaml } from "yaml";

import { Fu4Error, failedWith } from "#/shared/lib/errors.ts";

const DOCS_ROOT = "https://raw.githubusercontent.com/github/docs/refs/heads/main";
const DOCS = `${DOCS_ROOT}/content/actions/reference/workflows-and-actions`;
const REUSABLE = /\{%\s*data\s+reusables\.([\w.-]+)\s*%\}/gu;
const CONTEXTS = `${DOCS}/contexts.md`;
const EVENTS = `${DOCS}/events-that-trigger-workflows.md`;
const SCHEMA =
  "https://raw.githubusercontent.com/SchemaStore/schemastore/master/src/schemas/json/github-workflow.json";
const SEED =
  "https://raw.githubusercontent.com/rhysd/actionlint/v1.7.12/scripts/generate-popular-actions/popular_actions.json";
const SNAPSHOT_IF = "jobs.<job_id>.snapshot.if";
const SNAPSHOT_CONTEXTS = ["github", "inputs", "matrix", "needs", "strategy", "vars"];
const MIN_NODE = 20;
const OUTDATED = [
  "actions/labeler@v1",
  "actions/checkout@v1",
  "actions/upload-artifact@v1",
  "actions/download-artifact@v1",
];
const FETCH_CONCURRENCY = 8;
const LIQUID = /\{%[^%]+%\}/gu;
const TAG = /<[^>]+>/gu;
const BRANCH = /\{%-?\s*(ifversion|elsif|else|endif)\b([^%]*?)-?%\}/gu;
const EMPTY_ROW = /^\|\s*\|\s*$/u;
const NOT_APPLICABLE = "Not applicable";

const Registry = Schema.Array(
  Schema.Struct({
    slug: Schema.String,
    path: Schema.optional(Schema.String),
    tags: Schema.Array(Schema.String),
    file_ext: Schema.optional(Schema.String),
    skip_inputs: Schema.optional(Schema.Boolean),
    skip_outputs: Schema.optional(Schema.Boolean),
  }),
);

const fetchText = (url: string): Effect.Effect<string, Fu4Error> =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`${String(response.status)} ${response.statusText}`);
      }
      return response.text();
    },
    catch: failedWith(`could not fetch ${url}`),
  });

const withReusables = (source: string): Effect.Effect<string, Fu4Error> =>
  Effect.gen(function* expandReusables() {
    const names = Arr.dedupe(Arr.map([...source.matchAll(REUSABLE)], (match) => match[1] ?? ""));
    const bodies = yield* Effect.forEach(
      names,
      (name) =>
        fetchText(`${DOCS_ROOT}/data/reusables/${Str.replaceAll(".", "/")(name)}.md`).pipe(
          Effect.map((body) => [name, Str.trim(body)] as const),
        ),
      { concurrency: FETCH_CONCURRENCY },
    );
    const lookup = new Map(bodies);
    const expanded = source.replace(REUSABLE, (_, name: string) => lookup.get(name) ?? "");
    if (Arr.isReadonlyArrayEmpty([...expanded.matchAll(REUSABLE)])) {
      return expanded;
    }
    return yield* withReusables(expanded);
  });

const versionAtom = (atom: string): boolean => {
  const words = Str.split(Str.trim(atom), " ");
  const [head = ""] = words;
  if (head === "not") {
    return !versionAtom(Arr.join(words.slice(1), " "));
  }
  return !Arr.contains(["ghes", "ghae"], head);
};

const versionTest = (expression: string): boolean =>
  Arr.some(Str.split(expression, " or "), (alternative) =>
    Arr.every(Str.split(alternative, " and "), versionAtom),
  );

const forDotcom = (source: string): string => {
  const output: string[] = [];
  const stack: { taken: boolean; active: boolean }[] = [];
  const active = (): boolean => Arr.every(stack, (frame) => frame.active);
  let last = 0;
  for (const match of source.matchAll(BRANCH)) {
    if (active()) {
      output.push(source.slice(last, match.index));
    }
    last = match.index + match[0].length;
    const [, keyword = "", expression = ""] = match;
    const frame = stack.at(-1);
    if (keyword === "ifversion") {
      const value = versionTest(expression);
      stack.push({ taken: value, active: value });
    } else if (keyword === "elsif" && frame !== undefined) {
      const value = !frame.taken && versionTest(expression);
      frame.active = value;
      frame.taken ||= value;
    } else if (keyword === "else" && frame !== undefined) {
      frame.active = !frame.taken;
      frame.taken = true;
    } else if (keyword === "endif") {
      stack.pop();
    }
  }
  output.push(source.slice(last));
  return pipe(
    Str.replace(LIQUID, "")(Arr.join(output, "")),
    Str.split("\n"),
    Arr.filter((line) => !EMPTY_ROW.test(line)),
    Arr.join("\n"),
  );
};

const markdown = (source: string): Root =>
  unified().use(remarkParse).use(remarkGfm).parse(forDotcom(source));

const cellsOf = (row: TableRow): readonly string[] => Arr.map(row.children, (cell) => textOf(cell));

const listOf = (text: string): readonly string[] =>
  pipe(
    Str.split(Str.trim(text), ","),
    Arr.map((part) => Str.toLowerCase(Str.trim(part))),
    Arr.filter(Str.isNonEmpty),
    Arr.filter((part) => part !== "none"),
    Arr.sort(Str.Order),
  );

const tableAfter = (root: Root, heading: string): Table | undefined => {
  const start = root.children.findIndex(
    (node) => node.type === "heading" && textOf(node) === heading,
  );
  return root.children.slice(start + 1).find((node): node is Table => node.type === "table");
};

const availability = Effect.gen(function* availability() {
  const root = markdown(yield* fetchText(CONTEXTS));
  const table = tableAfter(root, "Context availability");
  if (table === undefined) {
    return yield* Fu4Error.make({ message: "no Context availability table" });
  }
  const rows = pipe(
    table.children.slice(1),
    Arr.map(cellsOf),
    Arr.map(([key = "", contexts = "", functions = ""]) => ({
      key,
      contexts: listOf(contexts),
      functions: listOf(functions),
    })),
    Arr.filter(({ key }) => Str.isNonEmpty(key)),
  );
  const keys = Arr.some(rows, ({ key }) => key === SNAPSHOT_IF)
    ? rows
    : [...rows, { key: SNAPSHOT_IF, contexts: SNAPSHOT_CONTEXTS, functions: [] }];
  return Rec.fromEntries(
    Arr.map(keys, ({ key, contexts, functions }) => [key, { contexts, functions }]),
  );
});

const activityTypes = (cell: string): readonly string[] | null => {
  if (cell === "Custom") {
    return null;
  }
  if (cell === NOT_APPLICABLE) {
    return [];
  }
  return pipe(
    Str.split(Str.replace(TAG, " ")(cell), "- "),
    Arr.map(Str.trim),
    Arr.filter(Str.isNonEmpty),
  );
};

const webhooks = Effect.gen(function* webhooks() {
  const root = markdown(yield* withReusables(yield* fetchText(EVENTS)));
  const entries: [string, readonly string[] | null][] = [];
  let hook = "";
  let seenAbout = false;
  for (const node of root.children) {
    if (node.type === "heading" && node.depth === 2) {
      const title = textOf(node);
      seenAbout ||= title === "About events that trigger workflows";
      hook = seenAbout && title !== "About events that trigger workflows" ? title : "";
    } else if (node.type === "table" && Str.isNonEmpty(hook)) {
      const [, row] = node.children;
      const types = row === undefined ? [] : activityTypes(Str.trim(cellsOf(row)[1] ?? ""));
      entries.push([hook, types]);
      hook = "";
    }
  }
  return Object.fromEntries(entries);
});

const JsonSchema = Schema.Struct({
  definitions: Schema.Record(
    Schema.String,
    Schema.Struct({
      enum: Schema.optional(Schema.Array(Schema.String)),
      $ref: Schema.optional(Schema.String),
      properties: Schema.optional(
        Schema.Record(
          Schema.String,
          Schema.Struct({
            enum: Schema.optional(Schema.Array(Schema.String)),
            $ref: Schema.optional(Schema.String),
          }),
        ),
      ),
    }),
  ),
});

const permissions = Effect.gen(function* permissions() {
  const schema = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(JsonSchema))(
    yield* fetchText(SCHEMA),
  ).pipe(Effect.mapError(failedWith("could not read the workflow schema")));
  const enumOf = (node: {
    readonly enum?: readonly string[] | undefined;
    readonly $ref?: string | undefined;
  }): readonly string[] =>
    node.enum ?? schema.definitions[Str.replace("#/definitions/", "")(node.$ref ?? "")]?.enum ?? [];
  const scopes = schema.definitions["permissions-event"]?.properties ?? {};
  return Rec.fromEntries(
    Arr.sort(Object.entries(scopes), (a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map(
      ([name, node]) => [name, enumOf(node)],
    ),
  );
});

const ACTION_SCHEMA =
  "https://raw.githubusercontent.com/SchemaStore/schemastore/master/src/schemas/json/github-action.json";

const Enumerated = Schema.Struct({ enum: Schema.Array(Schema.String) });

const ActionSchema = Schema.Struct({
  properties: Schema.Struct({
    branding: Schema.Struct({ properties: Schema.Struct({ color: Enumerated, icon: Enumerated }) }),
  }),
  definitions: Schema.Struct({
    "runs-javascript": Schema.Struct({ properties: Schema.Struct({ using: Enumerated }) }),
  }),
});

const actionMetadata = Effect.gen(function* actionMetadata() {
  const schema = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(ActionSchema))(
    yield* fetchText(ACTION_SCHEMA),
  ).pipe(Effect.mapError(failedWith("could not read the action schema")));
  const { color, icon } = schema.properties.branding.properties;
  const runtimes = Arr.filter(
    schema.definitions["runs-javascript"].properties.using.enum,
    (using) => !isOutdated("", using),
  );
  return { colors: color.enum, icons: icon.enum, runtimes };
});

const SHELLS = `${DOCS_ROOT}/data/reusables/actions/supported-shells.md`;

const shells = Effect.gen(function* shells() {
  const root = markdown(yield* fetchText(SHELLS));
  const table = root.children.find((node): node is Table => node.type === "table");
  if (table === undefined) {
    return yield* Fu4Error.make({ message: "no supported shells table" });
  }
  const rows = pipe(
    table.children.slice(1),
    Arr.map((row) => ({
      platform: Str.trim(textOf(row.children[0] ?? row)),
      cell: row.children[1],
    })),
    Arr.filter(
      ({ cell }) => cell?.children.length === 1 && cell.children[0]?.type === "inlineCode",
    ),
    Arr.map(({ platform, cell }) => ({ platform, shell: textOf(cell ?? table) })),
  );
  const on = (platform: string) =>
    pipe(
      rows,
      Arr.filter((row) => row.platform === platform || row.platform === "All"),
      Arr.map((row) => row.shell),
      Arr.dedupe,
      Arr.sort(Str.Order),
    );
  return { unix: on("Linux / macOS"), windows: on("Windows") };
});

const RUNNERS = `${DOCS_ROOT}/content/actions/reference/runners`;
const SELF_HOSTED = `${DOCS_ROOT}/content/actions/how-tos/manage-runners/self-hosted-runners/use-in-a-workflow.md`;
const ROW = /<tr>([\s\S]*?)<\/tr>/gu;
const CELL = /<td>([\s\S]*?)<\/td>/gu;
const LINKED_LABEL = /<code><a href="([^"]+)">([^<]+)<\/a><\/code>/gu;
const PLAIN_LABEL = /<code>([^<]+)<\/code>/gu;
const AVAILABLE = /^Available (\S+) /u;

interface HostedLabel {
  readonly label: string;
  readonly os: string;
  readonly image: string;
}

const standardRunners = Effect.gen(function* standardRunners() {
  const source = yield* withReusables(yield* fetchText(`${RUNNERS}/github-hosted-runners.md`));
  return Arr.flatMap([...source.matchAll(ROW)], (row) => {
    const cells = Arr.map([...(row[1] ?? "").matchAll(CELL)], (cell) => Str.trim(cell[1] ?? ""));
    const os = cells[0] ?? "";
    return Arr.map([...(cells.at(-1) ?? "").matchAll(LINKED_LABEL)], (link): HostedLabel => ({
      label: link[2] ?? "",
      os,
      image: Str.replace(/^.*\//u, "")(link[1] ?? ""),
    }));
  });
});

const largerRunners = Effect.gen(function* largerRunners() {
  const root = markdown(yield* withReusables(yield* fetchText(`${RUNNERS}/larger-runners.md`)));
  const labels: HostedLabel[] = [];
  let os = "";
  for (const node of root.children) {
    if (node.type === "heading") {
      os = AVAILABLE.exec(textOf(node))?.[1] ?? "";
    } else if (node.type === "table" && Str.isNonEmpty(os)) {
      for (const [index, row] of node.children.slice(1).entries()) {
        const html = Arr.join(
          Arr.map(row.children.at(-1)?.children ?? [], (child) =>
            "value" in child ? child.value : "",
          ),
          "",
        );
        for (const code of html.matchAll(PLAIN_LABEL)) {
          labels.push({ label: code[1] ?? "", os, image: `${os}-larger-${String(index)}` });
        }
      }
    }
  }
  return labels;
});

const selfHostedRunners = Effect.gen(function* selfHostedRunners() {
  const root = markdown(yield* fetchText(SELF_HOSTED));
  const start = root.children.findIndex(
    (node) => node.type === "heading" && textOf(node) === "Using default labels to route jobs",
  );
  const list = root.children.slice(start + 1).find((node) => node.type === "list");
  const items = list?.type === "list" ? list.children : [];
  const codes = (item: (typeof items)[number]) => {
    const found: string[] = [];
    const walk = (node: {
      readonly type: string;
      readonly value?: string;
      readonly children?: readonly unknown[];
    }) => {
      if (node.type === "inlineCode" && node.value !== undefined) {
        found.push(Str.toLowerCase(node.value));
      }
      for (const child of node.children ?? []) {
        walk(child as never);
      }
    };
    walk(item);
    return found;
  };
  const isOs = (item: (typeof items)[number]) => Str.includes("operating system")(textOf(item));
  return {
    os: Arr.flatMap(Arr.filter(items, isOs), codes),
    other: Arr.flatMap(
      Arr.filter(items, (item) => !isOs(item)),
      codes,
    ),
  };
});

const runners = Effect.gen(function* runners() {
  const [standard, larger, selfHosted] = yield* Effect.all(
    [standardRunners, largerRunners, selfHostedRunners],
    { concurrency: "unbounded" },
  );
  const hosted = Arr.dedupeWith([...standard, ...larger], (a, b) => a.label === b.label);
  return {
    hosted: Arr.map(hosted, ({ label, os, image }) => ({ label, os: Str.toLowerCase(os), image })),
    selfHosted,
  };
});

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  Predicate.isObject(value) && !Array.isArray(value);

const recordOf = (value: unknown): Readonly<Record<string, unknown>> =>
  isRecord(value) ? value : {};

const metadataOf = (source: string, skipInputs: boolean, skipOutputs: boolean) => {
  const parsed = recordOf(parseYaml(source, { uniqueKeys: false }));
  const inputs = Rec.fromEntries(
    Arr.map(Object.entries(recordOf(parsed.inputs)), ([name, value]) => {
      const input = recordOf(value);
      const message =
        typeof input.deprecationMessage === "string" ? Str.trim(input.deprecationMessage) : "";
      return [
        Str.toLowerCase(name),
        {
          name,
          required: input.required === true && !("default" in input),
          deprecated: "deprecationMessage" in input,
          deprecationMessage: message,
        },
      ];
    }),
  );
  const outputs = Rec.fromEntries(
    Arr.map(Object.keys(recordOf(parsed.outputs)), (name) => [Str.toLowerCase(name), { name }]),
  );
  const using = String(recordOf(parsed.runs).using ?? "");
  return { name: String(parsed.name ?? ""), inputs, outputs, skipInputs, skipOutputs, using };
};

const isOutdated = (spec: string, using: string): boolean => {
  if (Arr.contains(OUTDATED, spec)) {
    return true;
  }
  const version = Number.parseInt(Str.replace(/^node/u, "")(using), 10);
  return Str.startsWith("node")(using) && Number.isFinite(version) && version < MIN_NODE;
};

const popularActions = Effect.gen(function* popularActions() {
  const seed = yield* fetchText(SEED);
  const registry = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(Registry))(seed).pipe(
    Effect.mapError(failedWith("could not read the popular action list")),
  );
  const requests = Arr.flatMap(registry, (action) =>
    Arr.map(action.tags, (tag) => ({ action, tag })),
  );
  const fetched = yield* Effect.forEach(
    requests,
    ({ action, tag }) => {
      const path = action.path ?? "";
      const url = `https://raw.githubusercontent.com/${action.slug}/${tag}${path}/action.${action.file_ext ?? "yml"}`;
      return fetchText(url).pipe(
        Effect.map((source) => ({
          spec: `${action.slug}${path}@${tag}`,
          meta: metadataOf(source, action.skip_inputs ?? false, action.skip_outputs ?? false),
        })),
        Effect.option,
      );
    },
    { concurrency: FETCH_CONCURRENCY },
  );
  const sorted = Arr.sort(Arr.getSomes(fetched), (a, b) =>
    a.spec < b.spec ? -1 : a.spec > b.spec ? 1 : 0,
  );
  const outdated = pipe(
    sorted,
    Arr.filter(({ spec, meta }) => isOutdated(spec, meta.using)),
    Arr.map(({ spec }) => spec),
  );
  const actions = pipe(
    sorted,
    Arr.filter(({ spec }) => !Arr.contains(outdated, spec)),
    Arr.map(({ spec, meta }) => [spec, meta] as const),
    Rec.fromEntries,
  );
  return { actions, outdated };
});

const generate = Effect.gen(function* generate() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const output = path.resolve(import.meta.dirname, "..", "native", "core", "data");
  yield* fileSystem.makeDirectory(output, { recursive: true });
  const [contexts, hooks, actions, scopes, shellNames, runnerLabels, metadata] = yield* Effect.all(
    [availability, webhooks, popularActions, permissions, shells, runners, actionMetadata],
    {
      concurrency: "unbounded",
    },
  );
  const write = (name: string, value: unknown) =>
    fileSystem.writeFileString(path.join(output, name), `${JSON.stringify(value, null, 2)}\n`);
  yield* write("availability.json", contexts);
  yield* write("webhooks.json", hooks);
  yield* write("popular-actions.json", actions);
  yield* write("permissions.json", scopes);
  yield* write("shells.json", shellNames);
  yield* write("runners.json", runnerLabels);
  yield* write("action.json", metadata);
});

runMain(generate.pipe(Effect.provide(NodeServices.layer)));
