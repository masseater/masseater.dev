import type { Position, YamlNode } from "@r_masseater/fu4";
import { Option, Predicate } from "effect";

import type { Container, Credentials, Services } from "#/entities/workflow/model/job-types.ts";
import { quote } from "#/shared/text/index.ts";

import { foldEntries, rejecting, setters } from "./fold.ts";
import { entryRecord, parseSection } from "./mapping.ts";
import type { Entry } from "./mapping.ts";
import { mayParseExpression, parseString } from "./scalar.ts";
import { parseEnv } from "./sections.ts";
import { parseStringSequence } from "./sequence.ts";
import type { Sink } from "./sink.ts";

const text =
  (sink: Sink, allowEmpty: boolean) =>
  (entry: Entry): NonNullable<Container["image"]> =>
    parseString(sink)(entry.value, allowEmpty);

const parseCredentials =
  (sink: Sink) =>
  (entry: Entry): Option.Option<Credentials> => {
    const expression = mayParseExpression(entry.value);
    if (Option.isSome(expression)) {
      return Option.some({ expression: expression.value });
    }
    const { set } = setters<Credentials>();
    const credentials = foldEntries<Credentials>({
      entries: parseSection(sink)({
        section: "credentials",
        node: entry.value,
        allowEmpty: false,
        caseSensitive: true,
      }),
      initial: {},
      handlers: [
        ["username", set("username", text(sink, false))],
        ["password", set("password", text(sink, false))],
      ],
      unknown: rejecting({ sink, section: "credentials", expected: ["username", "password"] }),
    });
    if (
      Predicate.isUndefined(credentials.username) ||
      Predicate.isUndefined(credentials.password)
    ) {
      sink.error(
        entry.key,
        'both "username" and "password" must be specified in "credentials" section',
      );
      return Option.none();
    }
    return Option.some(credentials);
  };

const strings =
  (sink: Sink, section: string) =>
  (entry: Entry): Container["ports"] =>
    parseStringSequence(sink)({
      section,
      node: entry.value,
      allowEmpty: true,
      allowElementEmpty: false,
    });

const CONTAINER_KEYS = ["image", "credentials", "env", "ports", "volumes", "options"];

const containerMapping =
  (sink: Sink) =>
  (section: string, node: YamlNode): Container => {
    const { set, setSome } = setters<Container>();
    return foldEntries<Container>({
      entries: parseSection(sink)({ section, node, allowEmpty: false, caseSensitive: true }),
      initial: { ports: [], volumes: [] },
      handlers: [
        ["image", set("image", text(sink, false))],
        ["credentials", setSome("credentials", parseCredentials(sink))],
        ["env", set("env", (entry) => parseEnv(sink)(entry.value))],
        ["ports", set("ports", strings(sink, "ports"))],
        ["volumes", set("volumes", strings(sink, "volumes"))],
        ["options", set("options", text(sink, true))],
      ],
      unknown: rejecting({ sink, section, expected: CONTAINER_KEYS }),
    });
  };

export const parseContainer =
  (sink: Sink) =>
  (section: string, at: Position, node: YamlNode): Container => {
    if (node.kind === "scalar") {
      return { ports: [], volumes: [], image: parseString(sink)(node, false) };
    }
    const container = containerMapping(sink)(section, node);
    if (Predicate.isUndefined(container.image)) {
      sink.error(at, `"image" is missing in ${quote(section)} section`);
    }
    return container;
  };

export const parseServices =
  (sink: Sink) =>
  (node: YamlNode): Services => {
    const expression = mayParseExpression(node);
    if (Option.isSome(expression)) {
      return { value: {}, expression: expression.value };
    }
    const entries = parseSection(sink)({
      section: "services",
      node,
      allowEmpty: false,
      caseSensitive: false,
    });
    return {
      value: entryRecord((entry) => ({
        name: entry.key,
        container: parseContainer(sink)("services", entry.key, entry.value),
      }))(entries),
    };
  };
