import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import type { Segment } from "#/pages/about/model/content";
import { ExternalLink } from "#/shared/ui/external-link";

const segmentNode = ({ text, href }: Segment): ReactNode =>
  Option.match(Option.fromNullishOr(href), {
    onNone: () => text,
    onSome: (url) => <ExternalLink key={url} href={url} text={text} />,
  });

const AboutParagraph = ({ segments }: Readonly<{ segments: readonly Segment[] }>): ReactNode => (
  <p>{pipe(segments, Arr.map(segmentNode))}</p>
);

export { AboutParagraph };
