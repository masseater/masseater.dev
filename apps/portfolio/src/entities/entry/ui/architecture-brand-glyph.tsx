import { Option, Record as Rec, pipe } from "effect";
import type { ReactNode } from "react";

const monochrome: Readonly<Record<string, string>> = {
  "181717": "currentColor",
  "000000": "currentColor",
};

const fillOf = (hex: string): string =>
  pipe(
    Rec.get(monochrome, hex),
    Option.getOrElse(() => `#${hex}`),
  );

const ArchitectureBrandGlyph = ({
  path,
  hex,
  size,
}: Readonly<{ path: string; hex: string; size: number }>): ReactNode => (
  <svg aria-hidden="true" height={size} viewBox="0 0 24 24" width={size}>
    <path d={path} fill={fillOf(hex)} />
  </svg>
);

export { ArchitectureBrandGlyph };
