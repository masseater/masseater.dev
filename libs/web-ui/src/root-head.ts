import { Array as Arr, Option, Schema, pipe } from "effect";
import type { JSX } from "react";

import { WEB_ANALYTICS_BEACON } from "./web-analytics.ts";

interface HeadRequest {
  readonly title: string;
  readonly stylesheet: string;
  readonly searchIndexOrigin: Option.Option<string>;
  readonly webAnalyticsToken: unknown;
}

interface Head {
  readonly meta: JSX.IntrinsicElements["meta"][];
  readonly links: JSX.IntrinsicElements["link"][];
  readonly scripts: (JSX.IntrinsicElements["script"] & { readonly "data-cf-beacon": string })[];
}

const encodeBeacon = Schema.encodeOption(
  Schema.fromJsonString(Schema.Struct({ token: Schema.String })),
);

const webAnalyticsBeacon = (token: string): Head["scripts"][number] => ({
  ...WEB_ANALYTICS_BEACON,
  defer: true,
  "data-cf-beacon": Option.getOrElse(encodeBeacon({ token }), () => ""),
});

const rootHead = ({
  title,
  stylesheet,
  searchIndexOrigin,
  webAnalyticsToken,
}: HeadRequest): Head => ({
  meta: [
    { charSet: "utf8" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    { title },
    ...Option.match(searchIndexOrigin, {
      onNone: () => [{ name: "robots", content: "noindex" }],
      onSome: () => [],
    }),
  ],
  links: [{ rel: "stylesheet", href: stylesheet }],
  scripts: pipe(
    Schema.decodeUnknownOption(Schema.NonEmptyString)(webAnalyticsToken),
    Option.map(webAnalyticsBeacon),
    Arr.fromOption,
  ),
});

export { rootHead };
export type { Head, HeadRequest };
