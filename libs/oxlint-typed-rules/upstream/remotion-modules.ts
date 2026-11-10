import { Option, Record } from "effect";

const local = (path: string): string => new URL(path, import.meta.url).pathname;

const UPSTREAM_REMOTION_TEST = /\/upstream\/remotion\/src\/tests\/[^/]+\.test\.ts$/u;

const UPSTREAM_REMOTION_RULE = /^\.\.\/rules\/(?<file>[a-z0-9-]+)$/u;

const VIRTUAL_REMOTION_RULE = "\0upstream-remotion-rule:";

const REMOTION_RULE_IDS: Readonly<Record<string, string>> = {
  "no-duration-frames-infinity": "duration-in-frames",
  "no-from-0": "from-0",
  "v4-import": "v4-config-import",
};

const ruleIdOf = (file: string): string =>
  Option.getOrElse(Record.get(REMOTION_RULE_IDS, file), () => file);

const ruleFileOf = (id: string): Option.Option<string> =>
  Option.fromNullishOr(UPSTREAM_REMOTION_RULE.exec(id)).pipe(
    Option.flatMap(({ groups }) => Option.fromNullishOr(groups)),
    Option.flatMap((groups) => Record.get(groups, "file")),
  );

const remotionModuleOf = (id: string, importer: string): Option.Option<string> =>
  Option.liftPredicate(importer, (candidate) => UPSTREAM_REMOTION_TEST.test(candidate)).pipe(
    Option.flatMap(() => ruleFileOf(id)),
    Option.map((file) => `${VIRTUAL_REMOTION_RULE}${ruleIdOf(file)}`),
  );

const remotionRuleModule = (id: string): Option.Option<string> =>
  Option.liftPredicate(id, (candidate) => candidate.startsWith(VIRTUAL_REMOTION_RULE)).pipe(
    Option.map((virtual) =>
      [
        `import plugin from ${JSON.stringify(local("../src/remotion.ts"))};`,
        `export default plugin.rules[${JSON.stringify(virtual.slice(VIRTUAL_REMOTION_RULE.length))}];`,
      ].join("\n"),
    ),
  );

const upstreamRemotionRules = {
  name: "upstream-remotion-rules",
  enforce: "pre",
  resolveId: (id: string, importer: string | undefined): string | undefined =>
    Option.fromNullishOr(importer).pipe(
      Option.flatMap((spec) => remotionModuleOf(id, spec)),
      Option.getOrUndefined,
    ),
  load: (id: string): string | undefined => Option.getOrUndefined(remotionRuleModule(id)),
} as const;

export { upstreamRemotionRules };
