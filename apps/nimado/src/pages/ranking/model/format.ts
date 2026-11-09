import { Option, String as Str, pipe } from "effect";

const NUMBER_FORMAT = new Intl.NumberFormat("ja-JP", { signDisplay: "never" });
const COMPACT_FORMAT = new Intl.NumberFormat("ja-JP", {
  notation: "compact",
  maximumFractionDigits: 1,
  signDisplay: "never",
});
const NONE = "–";
const ZERO = 0;
const DATE_LENGTH = 10;

type Style = "full" | "compact";

const FORMATS: Readonly<Record<Style, (count: number) => string>> = {
  full: (count) => NUMBER_FORMAT.format(count),
  compact: (count) => COMPACT_FORMAT.format(count),
};

const formatWith =
  (style: Style) =>
  (value: Option.Option<number>): string =>
    pipe(
      value,
      Option.map(FORMATS[style]),
      Option.getOrElse(() => NONE),
    );

const views = formatWith("full");

const compactViews = formatWith("compact");

const signOf = (count: number): string => {
  if (count > ZERO) {
    return "+";
  }
  if (count < ZERO) {
    return "−";
  }
  return "";
};

const signedWith =
  (style: Style) =>
  (value: Option.Option<number>): string =>
    pipe(
      value,
      Option.map((count) => `${signOf(count)}${FORMATS[style](count)}`),
      Option.getOrElse(() => NONE),
    );

const gap = signedWith("full");

const compactGap = signedWith("compact");

const pageLabel = ({ page, pages }: Readonly<{ page: number; pages: number }>): string =>
  `${page.toString()} / ${pages.toString()}`;

const dateOf = (iso: string): string => Str.slice(ZERO, DATE_LENGTH)(iso);

export { compactGap, compactViews, dateOf, gap, pageLabel, views };
