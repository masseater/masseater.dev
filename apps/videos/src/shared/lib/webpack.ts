import type { WebpackOverrideFn } from "@remotion/bundler";
import { enableTailwind } from "@remotion/tailwind-v4";
import { Option, pipe } from "effect";

const MARKDOWN = { test: /\.md$/u, type: "asset/source" } as const;

/** @internal */
export const webpackOverride: WebpackOverrideFn = (config) => {
  const withTailwind = enableTailwind(config);
  const rules = pipe(
    Option.fromNullishOr(withTailwind.module),
    Option.flatMap(({ rules: existing }) => Option.fromNullishOr(existing)),
    Option.getOrElse(() => []),
  );
  return { ...withTailwind, module: { ...withTailwind.module, rules: [...rules, MARKDOWN] } };
};
