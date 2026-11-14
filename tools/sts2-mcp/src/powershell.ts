import { Array as Arr, String as Str, pipe } from "effect";

const UTF16 = "utf16le";
const BASE64 = "base64";

const encodePowerShell = (script: string): string =>
  globalThis.Buffer.from(script, UTF16).toString(BASE64);

const quote = (value: string): string => `'${pipe(value, Str.replaceAll("'", "''"))}'`;

const list = (values: readonly string[]): string => pipe(values, Arr.map(quote), Arr.join(","));

export { encodePowerShell, list, quote };
