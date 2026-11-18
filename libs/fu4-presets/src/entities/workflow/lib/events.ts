import type { YamlNode } from "@r_masseater/fu4";
import { Array as Arr, Option, pipe } from "effect";

import type {
  EventFilter,
  RepositoryDispatchEvent,
  ScheduleEntry,
  ScheduleEvent,
  WebhookEvent,
} from "#/entities/workflow/model/types.ts";
import { optional } from "#/shared/record/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

import { foldEntries, rejecting, setters } from "./fold.ts";
import type { Handler, Handlers } from "./fold.ts";
import { parseMapping, parseSection } from "./mapping.ts";
import type { Entry } from "./mapping.ts";
import { parseString } from "./scalar.ts";
import { checkSequence, parseStringOrSequence } from "./sequence.ts";
import type { Sink } from "./sink.ts";

const SCHEDULE_ELEMENT = 'element of "schedule" section';

interface ScheduleState {
  readonly cron?: Text;
  readonly timezone?: Text;
}

const nonEmpty =
  (sink: Sink) =>
  (entry: Entry): Option.Option<Text> =>
    Option.liftPredicate(parseString(sink)(entry.value, false), (text) => text.value !== "");

const scheduleEntry =
  (sink: Sink) =>
  (node: YamlNode): Option.Option<ScheduleEntry> => {
    const { setSome } = setters<ScheduleState>();
    const state = foldEntries<ScheduleState>({
      entries: parseMapping(sink)({
        place: SCHEDULE_ELEMENT,
        node,
        allowEmpty: false,
        caseSensitive: true,
      }),
      initial: {},
      handlers: [
        ["cron", setSome("cron", nonEmpty(sink))],
        ["timezone", setSome("timezone", nonEmpty(sink))],
      ],
      unknown: rejecting({ sink, section: SCHEDULE_ELEMENT, expected: ["cron", "timezone"] }),
    });
    return pipe(
      Option.fromNullishOr(state.cron),
      Option.map((cron): ScheduleEntry => ({
        cron,
        ...optional("timezone")(Option.fromNullishOr(state.timezone)),
      })),
    );
  };

export const parseSchedule =
  (sink: Sink) =>
  (node: YamlNode): Option.Option<ScheduleEvent> => {
    if (!checkSequence(sink)({ section: "schedule", node, allowEmpty: false })) {
      return Option.none();
    }
    return Option.some({
      type: "schedule",
      schedules: pipe(
        node.children,
        Arr.flatMap((child) => Option.toArray(scheduleEntry(sink)(child))),
      ),
    });
  };

const strings =
  (sink: Sink) =>
  (entry: Entry): readonly Text[] =>
    parseStringOrSequence(sink)({
      section: entry.key.value,
      node: entry.value,
      allowEmpty: false,
      allowElementEmpty: false,
    });

export const parseRepositoryDispatch =
  (sink: Sink) =>
  (node: YamlNode): RepositoryDispatchEvent =>
    foldEntries<RepositoryDispatchEvent>({
      entries: parseSection(sink)({
        section: "repository_dispatch",
        node,
        allowEmpty: true,
        caseSensitive: true,
      }),
      initial: { type: "repository_dispatch", types: [] },
      handlers: [["types", setters<RepositoryDispatchEvent>().set("types", strings(sink))]],
      unknown: rejecting({ sink, section: "repository_dispatch", expected: ["types"] }),
    });

const WEBHOOK_FILTERS = [
  ["branches", "branches"],
  ["branches-ignore", "branchesIgnore"],
  ["tags", "tags"],
  ["tags-ignore", "tagsIgnore"],
  ["paths", "paths"],
  ["paths-ignore", "pathsIgnore"],
] as const;

const WEBHOOK_KEYS = [
  "types",
  "branches",
  "branches-ignore",
  "tags",
  "tags-ignore",
  "paths",
  "paths-ignore",
  "workflows",
];

export const emptyWebhook = (name: Text): WebhookEvent => ({
  type: "webhook",
  hook: name,
  types: [],
  workflows: [],
  line: name.line,
  column: name.column,
});

const webhookHandlers = (sink: Sink): Handlers<WebhookEvent> => {
  const { set } = setters<WebhookEvent>();
  const filter = (entry: Entry): EventFilter => ({ name: entry.key, values: strings(sink)(entry) });
  return [
    ["types", set("types", strings(sink))],
    ["workflows", set("workflows", strings(sink))],
    ...pipe(
      WEBHOOK_FILTERS,
      Arr.map(([key, field]): readonly [string, Handler<WebhookEvent>] => [
        key,
        set(field, filter),
      ]),
    ),
  ];
};

export const parseWebhook =
  (sink: Sink) =>
  (name: Text, node: YamlNode): WebhookEvent =>
    foldEntries<WebhookEvent>({
      entries: parseSection(sink)({
        section: name.value,
        node,
        allowEmpty: true,
        caseSensitive: true,
      }),
      initial: emptyWebhook(name),
      handlers: webhookHandlers(sink),
      unknown: rejecting({ sink, section: name.value, expected: WEBHOOK_KEYS }),
    });
