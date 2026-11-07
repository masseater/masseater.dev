import { burn } from "@kenjiuno/msgreader/lib/Burner.js";
import { TypeEnum } from "@kenjiuno/msgreader/lib/Reader.js";
import { Option, Array as Arr, Record as Rec, String as Str, pipe } from "effect";

const NEXT = 1;

const FIRST = 0;

const unitOf = (letter: string): number =>
  Option.getOrElse(Str.codePointAt(FIRST)(letter), () => FIRST);

const utf16Of = (text: string): Uint8Array =>
  new Uint8Array(Uint16Array.from(Str.split("")(text), (letter) => unitOf(letter)).buffer);

const compoundOf = (streams: Readonly<Record<string, Uint8Array>>): Uint8Array => {
  const entries = Rec.toEntries(streams);
  return burn([
    {
      name: "Root Entry",
      type: TypeEnum.ROOT,
      length: 0,
      children: pipe(
        entries,
        Arr.map((_entry, index) => index + NEXT),
      ),
    },
    ...pipe(
      entries,
      Arr.map(([name, data]) => ({
        name,
        type: TypeEnum.DOCUMENT,
        length: data.length,
        binaryProvider: () => data,
      })),
    ),
  ]);
};

export { compoundOf, utf16Of };
