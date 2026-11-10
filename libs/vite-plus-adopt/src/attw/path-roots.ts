import { Option, Predicate } from "effect";

interface PathRoot {
  readonly length: number;
  readonly isUrl: boolean;
}

const FIRST = 0;
const NEXT = 1;
const AFTER_NEXT = 2;
const NOT_FOUND = -1;
const DOS_ROOT_LENGTH = 3;
const DOS_DRIVE_LENGTH = 2;
const ENCODED_SEPARATOR_LENGTH = 3;
const SLASH = "/";
const BACKSLASH = "\\";
const SCHEME_SEPARATOR = "://";
const DOS_ROOT = /^[A-Za-z]:[/\\]/u;
const DOS_DRIVE = /^[A-Za-z]:$/u;
const VOLUME_CHARACTER = /^[A-Za-z]$/u;
const ENCODED_VOLUME_SEPARATOR = /^%3[Aa]/u;
const FILE_SCHEME = "file";
const LOCAL_AUTHORITIES: ReadonlySet<string> = new Set(["", "localhost"]);

const RELATIVE: PathRoot = { length: FIRST, isUrl: false };

const diskRoot = (length: number): PathRoot => ({ length, isUrl: false });
const urlRoot = (length: number): PathRoot => ({ length, isUrl: true });

const isVolumeCharacter = (character: string | undefined): boolean =>
  Predicate.isNotUndefined(character) && VOLUME_CHARACTER.test(character);

const posixOrUncRoot = (path: string, separator: string): PathRoot => {
  if (path[NEXT] !== separator) {
    return diskRoot(NEXT);
  }
  const serverEnd = path.indexOf(separator, AFTER_NEXT);
  if (serverEnd === NOT_FOUND) {
    return diskRoot(path.length);
  }
  return diskRoot(serverEnd + NEXT);
};

const dosRoot = (path: string): Option.Option<PathRoot> => {
  if (DOS_ROOT.test(path)) {
    return Option.some(diskRoot(DOS_ROOT_LENGTH));
  }
  return Option.liftPredicate(diskRoot(DOS_DRIVE_LENGTH), () => DOS_DRIVE.test(path));
};

const fileUrlVolumeSeparatorEnd = (url: string, start: number): Option.Option<number> => {
  if (url[start] === ":") {
    return Option.some(start + NEXT);
  }
  return Option.liftPredicate(start + ENCODED_SEPARATOR_LENGTH, () =>
    ENCODED_VOLUME_SEPARATOR.test(url.slice(start)),
  );
};

const fileUrlVolumeRoot = (url: string, authorityEnd: number): Option.Option<PathRoot> =>
  fileUrlVolumeSeparatorEnd(url, authorityEnd + AFTER_NEXT).pipe(
    Option.flatMap((end) => {
      if (url[end] === SLASH) {
        return Option.some(urlRoot(end + NEXT));
      }
      return Option.liftPredicate(urlRoot(end), () => end === url.length);
    }),
  );

const isLocalFileUrl = (url: string, schemeEnd: number, authorityEnd: number): boolean =>
  url.slice(FIRST, schemeEnd) === FILE_SCHEME &&
  LOCAL_AUTHORITIES.has(url.slice(schemeEnd + SCHEME_SEPARATOR.length, authorityEnd)) &&
  isVolumeCharacter(url[authorityEnd + NEXT]);

const urlRootOf = (url: string, schemeEnd: number): PathRoot => {
  const authorityEnd = url.indexOf(SLASH, schemeEnd + SCHEME_SEPARATOR.length);
  if (authorityEnd === NOT_FOUND) {
    return urlRoot(url.length);
  }
  const volume = Option.liftPredicate(url, () => isLocalFileUrl(url, schemeEnd, authorityEnd)).pipe(
    Option.flatMap(() => fileUrlVolumeRoot(url, authorityEnd)),
  );
  return Option.getOrElse(volume, () => urlRoot(authorityEnd + NEXT));
};

const getPathRoot = (path: string): PathRoot => {
  const [first] = path;
  if (first === SLASH || first === BACKSLASH) {
    return posixOrUncRoot(path, first);
  }
  return dosRoot(path).pipe(
    Option.getOrElse(() => {
      const schemeEnd = path.indexOf(SCHEME_SEPARATOR);
      if (schemeEnd === NOT_FOUND) {
        return RELATIVE;
      }
      return urlRootOf(path, schemeEnd);
    }),
  );
};

const getRootLength = (path: string): number => getPathRoot(path).length;

const isRootedDiskPath = (path: string): boolean => {
  const root = getPathRoot(path);
  return root.length > FIRST && !root.isUrl;
};

export { getRootLength, isRootedDiskPath };
