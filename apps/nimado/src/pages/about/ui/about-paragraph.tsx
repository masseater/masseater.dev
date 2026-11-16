import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import type { Segment } from "#/pages/about/model/content.ts";
import { ExternalLink } from "#/shared/ui/external-link.tsx";

const segmentNode = ({ text, href }: Segment): ReactNode =>
  Option.match(Option.fromNullishOr(href), {
    onNone: () => text,
    onSome: (url) => <ExternalLink key={url} href={url} text={text} />,
  });

export const AboutParagraph = ({
  segments,
}: Readonly<{ segments: readonly Segment[] }>): ReactNode => (
  <p>{pipe(segments, Arr.map(segmentNode))}</p>
);
