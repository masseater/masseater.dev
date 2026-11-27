import type { YamlNode } from "@r_masseater/fu4";
import { Array as Arr, Option, pipe } from "effect";

import type { Event } from "#/entities/workflow/model/types.ts";

import {
  EMPTY_IMAGE_VERSION,
  emptyDispatch,
  parseImageVersion,
  parseWorkflowDispatch,
} from "./dispatch.ts";
import { emptyWebhook, parseRepositoryDispatch, parseSchedule, parseWebhook } from "./events.ts";
import { parseSection } from "./mapping.ts";
import type { Entry } from "./mapping.ts";
import { parseString } from "./scalar.ts";
import { checkNotEmpty } from "./sequence.ts";
import type { Sink } from "./sink.ts";
import { emptyCall, parseWorkflowCall } from "./workflow-call.ts";

const withoutConfig =
  (sink: Sink) =>
  (node: YamlNode): Option.Option<Event> => {
    const name = parseString(sink)(node, false);
    switch (name.value) {
      case "": {
        return Option.none();
      }
      case "schedule": {
        sink.error(node, "schedule event must be configured with mapping");
        return Option.none();
      }
      case "repository_dispatch": {
        return Option.some({ type: "repository_dispatch", types: [] });
      }
      case "workflow_dispatch": {
        return Option.some(emptyDispatch(node));
      }
      case "workflow_call": {
        return Option.some(emptyCall(node));
      }
      case "image_version": {
        return Option.some(EMPTY_IMAGE_VERSION);
      }
      default: {
        return Option.some({ ...emptyWebhook(name), line: node.line, column: node.column });
      }
    }
  };

const configured =
  (sink: Sink) =>
  (entry: Entry): Option.Option<Event> => {
    switch (entry.id) {
      case "schedule": {
        return parseSchedule(sink)(entry.value);
      }
      case "workflow_dispatch": {
        return Option.some(parseWorkflowDispatch(sink)(entry.key, entry.value));
      }
      case "repository_dispatch": {
        return Option.some(parseRepositoryDispatch(sink)(entry.value));
      }
      case "workflow_call": {
        return Option.some(parseWorkflowCall(sink)(entry.key, entry.value));
      }
      case "image_version": {
        return Option.some(parseImageVersion(sink)(entry.value));
      }
      default: {
        return Option.some(parseWebhook(sink)(entry.key, entry.value));
      }
    }
  };

const each =
  <Item>(parse: (item: Item) => Option.Option<Event>) =>
  (items: readonly Item[]): readonly Event[] =>
    pipe(
      items,
      Arr.flatMap((item) => Option.toArray(parse(item))),
    );

export const parseEvents =
  (sink: Sink) =>
  (node: YamlNode): Option.Option<readonly Event[]> => {
    if (node.kind === "scalar") {
      return withoutConfig(sink)(node).pipe(Option.toArray, Option.some);
    }
    if (node.kind === "mapping") {
      const entries = parseSection(sink)({
        section: "on",
        node,
        allowEmpty: false,
        caseSensitive: true,
      });
      return Option.some(each(configured(sink))(entries));
    }
    if (node.kind === "sequence") {
      checkNotEmpty(sink)("on", node);
      return Option.some(each(withoutConfig(sink))(node.children));
    }
    sink.error(
      node,
      `"on" section value is expected to be mapping or sequence but found ${node.kind} node`,
    );
    return Option.none();
  };
