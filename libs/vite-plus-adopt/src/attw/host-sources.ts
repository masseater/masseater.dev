import { Option } from "effect";
import type { SourceFile } from "typescript/ast";

import { toPath } from "./paths.ts";
import type { ResolutionMode } from "./resolution-types.ts";
import { attachFileInfo } from "./source-file.ts";
import { parseSourceFile } from "./ts-api.ts";

interface SourceFileOrigin {
  readonly read: (fileName: string) => Option.Option<string>;
  readonly impliedFormat: (fileName: string) => Option.Option<ResolutionMode>;
}

interface SourceFileStore {
  readonly open: (fileName: string) => Option.Option<SourceFile>;
  readonly cached: (fileName: string) => Option.Option<SourceFile>;
}

const createSourceFileStore = (origin: SourceFileOrigin): SourceFileStore => {
  const sourceFiles = new Map<string, SourceFile>();
  const cached = (fileName: string): Option.Option<SourceFile> =>
    Option.fromNullishOr(sourceFiles.get(toPath(fileName)));
  const storeParsed = (fileName: string, content: string): SourceFile => {
    const parsed = parseSourceFile(fileName, content, Option.none());
    const sourceFile = attachFileInfo(parsed, origin.impliedFormat(fileName));
    sourceFiles.set(toPath(fileName), sourceFile);
    return sourceFile;
  };
  return {
    open: (fileName) =>
      Option.orElse(cached(fileName), () =>
        origin.read(fileName).pipe(Option.map((content) => storeParsed(fileName, content))),
      ),
    cached,
  };
};

export { createSourceFileStore };
export type { SourceFileOrigin, SourceFileStore };
