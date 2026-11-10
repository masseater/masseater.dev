import { Option } from "effect";

import { RuleTester } from "./rule-tester.ts";
import type { UpstreamParserOptions } from "./rule-tester.ts";

interface LegacyOptions {
  readonly parser?: string | undefined;
  readonly parserOptions?: UpstreamParserOptions | undefined;
}

const createRuleTester = (options: LegacyOptions): RuleTester =>
  new RuleTester(
    Option.fromNullishOr(options.parserOptions).pipe(
      Option.match({
        onNone: () => ({}),
        onSome: (parserOptions) => ({ languageOptions: { parserOptions } }),
      }),
    ),
  );

export type { LegacyOptions };
export { createRuleTester };
