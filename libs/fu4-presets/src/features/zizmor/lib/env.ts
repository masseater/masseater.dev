import { Option, String as Str } from "effect";

import type { EnvValue } from "#/features/zizmor/model/common.ts";

const TRUE = new Set(["true", "True", "TRUE"]);
const FALSE = new Set(["false", "False", "FALSE"]);

export const csharpBool = (value: EnvValue): boolean => {
  if (value.type === "boolean") {
    return value.value;
  }
  return value.type === "string" && Str.toLowerCase(Str.trim(value.value)) === "true";
};

export const toolkitBool = (value: EnvValue): Option.Option<boolean> => {
  if (value.type === "boolean") {
    return Option.some(value.value);
  }
  if (value.type !== "string") {
    return Option.none();
  }
  const trimmed = Str.trim(value.value);
  if (TRUE.has(trimmed)) {
    return Option.some(true);
  }
  if (FALSE.has(trimmed)) {
    return Option.some(false);
  }
  return Option.none();
};
