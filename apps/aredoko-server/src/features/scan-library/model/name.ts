import { fileNameOf } from "@masseater.dev/aredoko-protocol";
import type { BoothItem } from "@masseater.dev/aredoko-protocol";
import { Array, Option, String, pipe } from "effect";

export const nameOf = (path: string): string =>
  pipe(fileNameOf(path), String.replace(/\.unitypackage$/iu, ""));

const boothWords = ({ name, shop, tags }: typeof BoothItem.Type): readonly string[] => [
  name,
  shop,
  ...tags,
];

export const labelOf = ({
  name,
  booth,
}: {
  readonly name: string;
  readonly booth: Option.Option<typeof BoothItem.Type>;
}): string =>
  pipe(
    booth,
    Option.map(boothWords),
    Option.getOrElse((): readonly string[] => []),
    Array.prepend(name),
    Array.join(" "),
  );
