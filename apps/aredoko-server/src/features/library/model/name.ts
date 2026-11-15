import type { BoothItem } from "@masseater.dev/aredoko-protocol";
import { Array, Option, String, pipe } from "effect";

import { partsOf } from "#/entities/package/index.ts";

export const nameOf = (path: string): string =>
  pipe(
    partsOf(path),
    Array.last,
    Option.getOrElse(() => path),
    String.replace(/\.unitypackage$/iu, ""),
  );

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
