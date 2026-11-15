import { Array, Option, Order, Record, pipe } from "effect";

const LANGUAGE_CODES = [
  "ja",
  "en",
  "zh-hans",
  "zh-hant",
  "ko",
  "ar",
  "az",
  "be",
  "bg",
  "bn",
  "ca",
  "ceb",
  "de",
  "es",
  "et",
  "eu",
  "fa",
  "fr",
  "gu",
  "he",
  "hi",
  "hr",
  "hu",
  "hy",
  "id",
  "it",
  "jv",
  "ka",
  "kk",
  "km",
  "lt",
  "lv",
  "ml",
  "mr",
  "ms",
  "my",
  "ne",
  "nl",
  "pa",
  "pl",
  "ru",
  "si",
  "sk",
  "sl",
  "sr",
  "sw",
  "ta",
  "te",
  "th",
  "tl",
  "ur",
  "uz",
  "vi",
] as const;

type LanguageCode = (typeof LANGUAGE_CODES)[number];

type Language = Readonly<{ code: LanguageCode; name: string }>;

const DISPLAY_LOCALE = "ja";

const SAME = 0;

const displayNames = new Intl.DisplayNames([DISPLAY_LOCALE], { type: "language" });

const collator = new Intl.Collator(DISPLAY_LOCALE);

const languageName = (code: LanguageCode): string => displayNames.of(code) ?? code;

const READINGS: Record.ReadonlyRecord<string, string> = {
  日本語: "にほんご",
  英語: "えいご",
  簡体中国語: "かんたいちゅうごくご",
  繁体中国語: "はんたいちゅうごくご",
  韓国語: "かんこくご",
};

const readingOf = (name: string): string =>
  pipe(
    Record.get(READINGS, name),
    Option.getOrElse(() => name),
  );

const byName = Order.make<Language>((self, that) =>
  Order.Number(collator.compare(readingOf(self.name), readingOf(that.name)), SAME),
);

const LANGUAGES: readonly Language[] = pipe(
  LANGUAGE_CODES,
  Array.map((code) => ({ code, name: languageName(code) })),
  Array.sortBy(byName),
);

const otherOf = (code: LanguageCode): LanguageCode => {
  if (code === "en") {
    return "ja";
  }
  return "en";
};

export { LANGUAGES, languageName, otherOf };
export type { Language, LanguageCode };
