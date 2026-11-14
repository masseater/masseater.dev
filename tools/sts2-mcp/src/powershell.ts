import { Array as Arr, String as Str, pipe } from "effect";

const UTF16 = "utf16le";
const BASE64 = "base64";

const encodePowerShell = (script: string): string =>
  globalThis.Buffer.from(script, UTF16).toString(BASE64);

const quote = (value: string): string => `'${pipe(value, Str.replaceAll("'", "''"))}'`;

const list = (values: readonly string[]): string => pipe(values, Arr.map(quote), Arr.join(","));

const withTextOutput = (script: string): string =>
  pipe(
    [
      "$ProgressPreference = 'SilentlyContinue'",
      "[Console]::OutputEncoding = [Text.Encoding]::UTF8",
      "& {",
      script,
      "} *>&1 | Out-String -Stream -Width 4096",
      "exit $LASTEXITCODE",
    ],
    Arr.join("\n"),
  );

export { encodePowerShell, list, quote, withTextOutput };
