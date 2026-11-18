import { Option, String as Str, pipe } from "effect";

import { quote } from "#/shared/text/index.ts";

const LOCAL = "./";
const SELF_REPOSITORY = "$/";

const stripped =
  (prefix: string) =>
  (spec: string): Option.Option<string> =>
    pipe(Option.liftPredicate(spec, Str.startsWith(prefix)), Option.map(Str.slice(prefix.length)));

export const localPath = (spec: string): Option.Option<string> =>
  Option.orElse(stripped(LOCAL)(spec), () => stripped(SELF_REPOSITORY)(spec));

export const isSelfReferenceWithRef = (spec: string): boolean =>
  Option.exists(stripped(SELF_REPOSITORY)(spec), Str.includes("@"));

export const selfReferenceError = (spec: string): string =>
  `self repository reference ${quote(spec)} must not include @{ref}. "$/" always resolves to the commit of the running workflow. see https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idstepsuses`;
