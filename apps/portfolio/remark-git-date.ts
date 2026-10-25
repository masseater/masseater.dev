import { Array as Arr, DateTime, Effect, Option, String as Str, pipe } from "effect";
import type { Root, RootContent, Yaml } from "mdast";
import { simpleGit } from "simple-git";
import type { Plugin } from "unified";
import type { VFile } from "vfile";

const DATE_LINES = /^(?:date|updated):.*\n?/gmu;

const git = simpleGit();

type Dates = Readonly<{ date: string; updated: string }>;

const commitDates = (path: string): Effect.Effect<readonly string[]> =>
  Effect.tryPromise(() => git.raw(["log", "--follow", "--format=%cs", "--", path])).pipe(
    Effect.map((stdout) => pipe(stdout, Str.split("\n"), Arr.filter(Str.isNonEmpty))),
    Effect.orElseSucceed(() => []),
  );

const today: Effect.Effect<string> = DateTime.now.pipe(Effect.map(DateTime.formatIsoDateUtc));

const entryDates = (path: string): Effect.Effect<Dates> =>
  Effect.all({ commits: commitDates(path), fallback: today }).pipe(
    Effect.map(({ commits, fallback }) => ({
      date: pipe(
        Arr.last(commits),
        Option.getOrElse(() => fallback),
      ),
      updated: pipe(
        Arr.head(commits),
        Option.getOrElse(() => fallback),
      ),
    })),
  );

const isYaml = (node: RootContent): node is Yaml => node.type === "yaml";

const emptyYaml = (): Yaml => ({ type: "yaml", value: "" });

const withDates = (yaml: Yaml, { date, updated }: Dates): Yaml => ({
  ...yaml,
  value: pipe(
    yaml.value,
    Str.replaceAll(DATE_LINES, ""),
    Str.trimEnd,
    (rest) => `${rest}\ndate: ${date}\nupdated: ${updated}`,
    Str.trim,
  ),
});

const dated = (tree: Root, dates: Dates): Root => ({
  ...tree,
  children: [
    withDates(pipe(tree.children, Arr.findFirst(isYaml), Option.getOrElse(emptyYaml)), dates),
    ...pipe(
      tree.children,
      Arr.filter((node) => !isYaml(node)),
    ),
  ],
});

const remarkGitDate: Plugin<[], Root> = () => (tree: Root, file: VFile) =>
  Effect.runPromise(entryDates(file.path).pipe(Effect.map((dates) => dated(tree, dates))));

export { remarkGitDate };
