import type { Html } from "@effect/ui/html";
import { Input } from "@masseater.dev/effect-ui";
import type { InputElement } from "@masseater.dev/effect-ui";
import { Redacted } from "effect";

import { COPY } from "#/shared/config/index.ts";

/** @stability experimental */
export const ApiKeyField = <Msg>({
  html,
  apiKey,
  onChange,
}: Readonly<{
  html: Html.H<Msg>;
  apiKey: Redacted.Redacted;
  onChange: (apiKey: Redacted.Redacted) => Msg;
}>): InputElement<Msg> =>
  Input({
    html,
    props: { value: Redacted.value(apiKey) },
    onUpdate: ({ value }) => onChange(Redacted.make(value)),
  }).attrs({
    type: "password",
    autocomplete: "off",
    placeholder: COPY.apiKey,
    "aria-label": COPY.apiKey,
  });
