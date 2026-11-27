import { Option, Record as Rec } from "effect";

const MISSING = "";

export const imageOf =
  (name: string) =>
  ({ images }: Readonly<{ images: Readonly<Record<string, string>> }>): string =>
    Option.getOrElse(Rec.get(images, name), () => MISSING);
