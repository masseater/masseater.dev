import { Array, String, pipe } from "effect";

const PACKAGE_EXTENSION = ".unitypackage";
const ZIP_EXTENSION = ".zip";

export const hasExtension =
  (...extensions: readonly string[]) =>
  (name: string): boolean => {
    const lower = String.toLowerCase(name);
    return pipe(
      extensions,
      Array.some((extension) => pipe(lower, String.endsWith(extension))),
    );
  };

export const isPackage = hasExtension(PACKAGE_EXTENSION);

export const isZip = hasExtension(ZIP_EXTENSION);
