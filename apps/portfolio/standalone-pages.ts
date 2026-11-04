import { webAnalyticsBeacon } from "@masseater.dev/ui/web-analytics";
import { Array as Arr, Option, Record as Rec, Schema, String as Str, pipe } from "effect";
import { viteStaticCopy } from "vite-plugin-static-copy";
import type { Plugin } from "vite-plus";

import { splitPadStylesheets } from "./standalone/split-pad/assets.ts";

const HEAD_END = "</head>";

const beaconTag = (token: string): string => {
  const beacon = webAnalyticsBeacon(token);
  return `<script defer src="${beacon.src}" integrity="${beacon.integrity}" crossorigin="${beacon.crossOrigin}" data-cf-beacon='${beacon["data-cf-beacon"]}'></script>`;
};

const withBeacon =
  (token: Option.Option<string>) =>
  (html: string): string =>
    Option.match(token, {
      onNone: () => html,
      onSome: (value) => pipe(html, Str.replace(HEAD_END, `${beaconTag(value)}${HEAD_END}`)),
    });

const PAGE_STYLESHEETS: Readonly<Record<string, readonly string[]>> = {
  "split-pad": splitPadStylesheets,
};

const withStylesheets =
  (filename: string) =>
  (html: string): string =>
    pipe(
      Rec.toEntries(PAGE_STYLESHEETS),
      Arr.findFirst(([page]) => Str.includes(`/${page}/`)(filename)),
      Option.match({ onNone: () => [], onSome: ([, hrefs]) => hrefs }),
      Arr.map((href) => `<link rel="stylesheet" href="${href}" />`),
      Arr.join(""),
      (links) => Str.replace(HEAD_END, `${links}${HEAD_END}`)(html),
    );

const standalonePages = (beaconToken: unknown): readonly Plugin[] =>
  viteStaticCopy({
    targets: [
      {
        src: "standalone/*/index.html",
        dest: ".",
        rename: { stripBase: 1 },
        transform: (html: string, filename: string): string =>
          pipe(
            html,
            withBeacon(Schema.decodeUnknownOption(Schema.NonEmptyString)(beaconToken)),
            withStylesheets(filename),
          ),
      },
    ],
  });

export { standalonePages };
