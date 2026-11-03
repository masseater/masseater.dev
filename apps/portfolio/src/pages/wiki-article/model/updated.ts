import { DateTime } from "effect";

const japaneseDate = (date: string): string =>
  DateTime.formatUtc(DateTime.makeUnsafe(date), { locale: "ja-JP", dateStyle: "long" });

export { japaneseDate };
