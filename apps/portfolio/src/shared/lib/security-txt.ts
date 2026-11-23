import { Array as Arr, DateTime, Effect } from "effect";

import { site } from "#/shared/config/index.ts";

const VALID_FOR = { days: 270 } as const;

const securityTxtLines = (expires: DateTime.Utc): readonly string[] => [
  `Contact: ${site.securityContact}`,
  `Expires: ${DateTime.formatIso(expires)}`,
  "Preferred-Languages: ja, en",
  `Canonical: ${site.url}${site.securityTxtPath}`,
  "",
];

const securityTxtOn = (now: DateTime.Utc): Response => {
  const lines = securityTxtLines(DateTime.add(now, VALID_FOR));
  return new Response(Arr.join(lines, "\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};

export const securityTxt: Effect.Effect<Response> = DateTime.now.pipe(Effect.map(securityTxtOn));
