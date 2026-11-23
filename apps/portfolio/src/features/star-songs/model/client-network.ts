import { Array as Arr, String as Str, pipe } from "effect";

const SEPARATOR = ":";
const OMITTED = "::";
const HEXTETS = 8;
const NETWORK_HEXTETS = 4;
const HEX = 16;
const ZERO = "0";
const NONE = 0;

const hextetsOf = (part: string): readonly string[] =>
  pipe(part, Str.split(SEPARATOR), Arr.filter(Str.isNonEmpty));

const canonical = (hextet: string): string => Number.parseInt(hextet, HEX).toString(HEX);

export const clientNetwork = (ip: string): string => {
  if (!Str.includes(SEPARATOR)(ip)) {
    return ip;
  }
  const [leading, ...rest] = pipe(Str.split(ip, OMITTED), Arr.map(hextetsOf));
  const trailing = Arr.flatten(rest);
  const omitted = Arr.makeBy(
    Math.max(HEXTETS - leading.length - trailing.length, NONE),
    () => ZERO,
  );
  return pipe(
    [...leading, ...omitted, ...trailing],
    Arr.take(NETWORK_HEXTETS),
    Arr.map(canonical),
    Arr.join(SEPARATOR),
  );
};
