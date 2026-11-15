import { Option } from "effect";

import { RuleTester } from "./rule-tester.ts";
import type { UpstreamParserOptions } from "./rule-tester.ts";

export interface LegacyOptions {
  readonly parser?: string | undefined;
  readonly parserOptions?: UpstreamParserOptions | undefined;
}

export const createRuleTester = (options: LegacyOptions): RuleTester =>
  new RuleTester(
    Option.fromNullishOr(options.parserOptions).pipe(
      Option.match({
        onNone: () => ({}),
        onSome: (parserOptions) => ({ languageOptions: { parserOptions } }),
      }),
    ),
  );
