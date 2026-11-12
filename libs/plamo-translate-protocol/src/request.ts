import { Predicate, Schema, String as Str } from "effect";

const RESERVED = "<|plamo:";

const Lang = Schema.String.check(
  Schema.isPattern(/^(?:[a-z]{2,3}(?:-[a-z]{4})?|ja\(easy\))$/u),
).annotate({ description: "Language code such as ja, en or zh-hans" });

const Form = Schema.Literals(["plain", "polite"]).annotate({
  description: "Japanese style: plain (da/dearu) or polite (desu/masu)",
});

const Text = Schema.String.check(
  Schema.makeFilter<string>((text) => !Str.includes(RESERVED)(text) || `text contains ${RESERVED}`),
);

const TranslateRequest = Schema.Struct({
  text: Text,
  to: Lang,
  from: Schema.optionalKey(Lang),
  form: Schema.optionalKey(Form),
}).check(
  Schema.makeFilter(
    ({ to, form }) =>
      Predicate.isUndefined(form) || to === "ja" || "form applies only when to is ja",
  ),
);

const TranslateResult = Schema.Struct({ text: Schema.String });

type TranslateRequestValue = typeof TranslateRequest.Type;

type TranslateResultValue = typeof TranslateResult.Type;

export { TranslateRequest, TranslateResult };
export type { TranslateRequestValue, TranslateResultValue };
