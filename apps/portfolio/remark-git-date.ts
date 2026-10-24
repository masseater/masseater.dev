import { Array as Arr, DateTime, Effect, Option, String as Str, pipe } from "effect";
import type { Root, RootContent, Yaml } from "mdast";
import { simpleGit } from "simple-git";
import type { Plugin } from "unified";
import type { VFile } from "vfile";

const DATE_LINE = /^date:.*\n?/mu;

const git = simpleGit();

const firstCommitDate = (path: string): Effect.Effect<Option.Option<string>> =>
  Effect.tryPromise(() =>
    git.raw(["log", "--follow", "--diff-filter=A", "--format=%cs", "--", path]),
  ).pipe(
    Effect.map((stdout) => pipe(stdout, Str.split("\n"), Arr.filter(Str.isNonEmpty), Arr.last)),
    Effect.orElseSucceed(Option.none),
  );

const today: Effect.Effect<string> = DateTime.now.pipe(Effect.map(DateTime.formatIsoDateUtc));

const entryDate = (path: string): Effect.Effect<string> =>
  firstCommitDate(path).pipe(
    Effect.flatMap(Option.match({ onNone: () => today, onSome: Effect.succeed })),
  );

const isYaml = (node: RootContent): node is Yaml => node.type === "yaml";

const emptyYaml = (): Yaml => ({ type: "yaml", value: "" });

const withDate = (yaml: Yaml, date: string): Yaml => ({
  ...yaml,
  value: pipe(
    yaml.value,
    Str.replace(DATE_LINE, ""),
    Str.trimEnd,
    (rest) => `${rest}\ndate: ${date}`,
    Str.trim,
  ),
});

const dated = (tree: Root, date: string): Root => ({
  ...tree,
  children: [
    withDate(pipe(tree.children, Arr.findFirst(isYaml), Option.getOrElse(emptyYaml)), date),
    ...pipe(
      tree.children,
      Arr.filter((node) => !isYaml(node)),
    ),
  ],
});

const remarkGitDate: Plugin<[], Root> = () => (tree: Root, file: VFile) =>
  Effect.runPromise(entryDate(file.path).pipe(Effect.map((date) => dated(tree, date))));

export { remarkGitDate };
