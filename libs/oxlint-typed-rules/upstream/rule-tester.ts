import { Array, Boolean as Bool, Option, Predicate, pipe } from "effect";
import type { Rule } from "vite-plus/lint/plugins";
import { RuleTester as OxlintRuleTester } from "vite-plus/lint/plugins-dev";

import { distinct } from "./test-cases.ts";

type TestCase = OxlintRuleTester.ValidTestCase;

type TestCases = OxlintRuleTester.TestCases;

type Hook = (fn: () => void) => void;

interface UpstreamParserOptions {
  readonly ecmaFeatures?: Readonly<{ jsx?: boolean | undefined }> | undefined;
  readonly tsconfigRootDir?: string | undefined;
}

interface UpstreamConfig {
  readonly languageOptions?:
    | Readonly<{ parserOptions?: UpstreamParserOptions | undefined }>
    | undefined;
}

const JSX_FILENAME = "react.tsx";

const TS_FILENAME = "file.ts";

const parserOptionsOf = (config: UpstreamConfig | TestCase): Option.Option<UpstreamParserOptions> =>
  Option.fromNullishOr(config.languageOptions).pipe(
    Option.flatMap(({ parserOptions }) => Option.fromNullishOr(parserOptions)),
  );

const isJsx = (parserOptions: Option.Option<UpstreamParserOptions>): boolean =>
  parserOptions.pipe(
    Option.flatMap(({ ecmaFeatures }) => Option.fromNullishOr(ecmaFeatures)),
    Option.exists(({ jsx }) => jsx === true),
  );

const defaultFilename = (config: UpstreamConfig, testCase: TestCase): string =>
  Bool.match(isJsx(parserOptionsOf(testCase)) || isJsx(parserOptionsOf(config)), {
    onTrue: () => JSX_FILENAME,
    onFalse: () => TS_FILENAME,
  });

const located =
  (config: UpstreamConfig) =>
  <Case extends TestCase>(testCase: Case): Case => {
    const filename = Option.getOrElse(Option.fromNullishOr(testCase.filename), () =>
      defaultFilename(config, testCase),
    );
    return {
      ...testCase,
      filename: parserOptionsOf(config).pipe(
        Option.flatMap(({ tsconfigRootDir }) => Option.fromNullishOr(tsconfigRootDir)),
        Option.match({
          onNone: () => filename,
          onSome: (rootDirectory) => `${rootDirectory}/${filename}`,
        }),
      ),
    };
  };

const isTestCase = (testCase: TestCase | string): testCase is TestCase =>
  !Predicate.isString(testCase);

const asTestCase = (testCase: TestCase | string): TestCase =>
  Option.match(Option.liftPredicate(testCase, Predicate.isString), {
    onNone: () => Option.getOrThrow(Option.liftPredicate(testCase, isTestCase)),
    onSome: (code) => ({ code }),
  });

class RuleTester {
  public static get describe(): OxlintRuleTester.DescribeFn {
    return OxlintRuleTester.describe;
  }

  public static set describe(value: OxlintRuleTester.DescribeFn) {
    OxlintRuleTester.describe = value;
  }

  public static get it(): OxlintRuleTester.ItFn {
    return OxlintRuleTester.it;
  }

  public static set it(value: OxlintRuleTester.ItFn) {
    OxlintRuleTester.it = value;
  }

  public static get itOnly(): OxlintRuleTester.ItFn {
    return OxlintRuleTester.itOnly;
  }

  public static set itOnly(value: OxlintRuleTester.ItFn) {
    OxlintRuleTester.itOnly = value;
  }

  public static afterAll?: Hook;

  readonly #config: UpstreamConfig;

  readonly #tester = new OxlintRuleTester({
    languageOptions: { parserOptions: { lang: "tsx" } },
  });

  public constructor(config: UpstreamConfig = {}) {
    this.#config = config;
  }

  public run(name: string, rule: Rule, tests: TestCases): void {
    const locate = located(this.#config);
    this.#tester.run(name, rule, {
      valid: pipe(tests.valid, Array.map(asTestCase), Array.map(locate), distinct),
      invalid: pipe(tests.invalid, Array.map(locate), distinct),
    });
  }
}

export type { Hook, TestCases, UpstreamConfig, UpstreamParserOptions };
export { RuleTester };
