import { Array as Arr, Match, Option, Predicate, pipe } from "effect";
import type { Rule } from "vite-plus/lint/plugins";
import { RuleTester as OxlintRuleTester } from "vite-plus/lint/plugins-dev";

import { distinct } from "./test-cases.ts";

type ValidCase = OxlintRuleTester.ValidTestCase;

type InvalidCase = OxlintRuleTester.InvalidTestCase;

interface UpstreamCases {
  readonly valid: readonly (ValidCase | string)[];
  readonly invalid: readonly InvalidCase[];
}

const local = (path: string): string => new URL(path, import.meta.url).pathname;

const SAMPLES = local("react/testing/samples");

const JSX_FILENAME = "react.tsx";

const TS_FILENAME = "file.ts";

const defaultFilename = ({ languageOptions }: ValidCase): string =>
  Option.fromNullishOr(languageOptions).pipe(
    Option.flatMap(({ parserOptions }) => Option.fromNullishOr(parserOptions)),
    Option.flatMap(({ ecmaFeatures }) => Option.fromNullishOr(ecmaFeatures)),
    Option.filter(({ jsx }) => jsx === false),
    Option.match({ onSome: () => TS_FILENAME, onNone: () => JSX_FILENAME }),
  );

const parserOptionsOf = ({ languageOptions }: ValidCase): object =>
  Option.fromNullishOr(languageOptions).pipe(
    Option.flatMap(({ parserOptions }) => Option.fromNullishOr(parserOptions)),
    Option.getOrElse(() => ({})),
  );

const located =
  (directory: string) =>
  <Case extends ValidCase>(testCase: Case): Case => ({
    ...testCase,
    languageOptions: {
      ...testCase.languageOptions,
      parserOptions: { ...parserOptionsOf(testCase), ignoreNonFatalErrors: true },
    },
    filename: `${directory}/${Option.getOrElse(Option.fromNullishOr(testCase.filename), () => defaultFilename(testCase))}`,
  });

const asTestCase = (testCase: ValidCase | string): ValidCase =>
  Match.value(testCase).pipe(
    Match.when(Predicate.isString, (code): ValidCase => ({ code })),
    Match.orElse((validCase) => validCase),
  );

const firstPass = (testCase: InvalidCase): InvalidCase => {
  const { output }: { readonly output?: unknown } = testCase;
  return Option.liftPredicate(output, (value): value is readonly unknown[] =>
    Arr.isArray(value),
  ).pipe(
    Option.map((passes): InvalidCase => ({
      ...testCase,
      output: Arr.head(passes).pipe(Option.filter(Predicate.isString), Option.getOrNull),
    })),
    Option.getOrElse(() => testCase),
  );
};

class RuleTester {
  readonly #directory: string;

  readonly #tester = new OxlintRuleTester({ eslintCompat: true });

  public constructor(directory: string) {
    this.#directory = directory;
  }

  public run(name: string, rule: Rule, tests: UpstreamCases): void {
    const locate = located(this.#directory);
    this.#tester.run(name, rule, {
      valid: pipe(tests.valid, Arr.map(asTestCase), Arr.map(locate), distinct),
      invalid: pipe(tests.invalid, Arr.map(firstPass), Arr.map(locate), distinct),
    });
  }
}

const PROJECTS = {
  preact: Option.some("jsx-preact"),
  preserve: Option.some("jsx-preserve"),
  "react-classic": Option.some("jsx-react"),
  "react-jsx": Option.none(),
  "react-native": Option.some("jsx-react-native"),
} as const satisfies Readonly<Record<string, Option.Option<string>>>;

type TsconfigFixtureName = keyof typeof PROJECTS;

const ruleTester = new RuleTester(SAMPLES);

const ruleTesterWithTypes = ruleTester;

const createRuleTesterForTsconfig = (name: TsconfigFixtureName): RuleTester =>
  PROJECTS[name].pipe(
    Option.match({
      onNone: () => ruleTester,
      onSome: (project) => new RuleTester(local(`react/testing/${project}`)),
    }),
  );

export type { InvalidCase, RuleTester, TsconfigFixtureName, UpstreamCases, ValidCase };
export { createRuleTesterForTsconfig, ruleTester, ruleTesterWithTypes };
