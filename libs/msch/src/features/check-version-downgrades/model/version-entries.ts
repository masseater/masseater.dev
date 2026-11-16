import { Array as Arr, Option, Record as Rec, Schema, String as Str, pipe } from "effect";
import { getStaticTOMLValue, parseTOML } from "toml-eslint-parser";
import { parse } from "yaml";

export interface VersionEntry {
  readonly key: string;
  readonly name: string;
  readonly spec: string;
}

type Fields = Readonly<Record<string, unknown>>;

const MANIFEST_SECTIONS = ["dependencies", "devDependencies", "optionalDependencies", "engines"];
const CARGO_SECTIONS = ["dependencies", "dev-dependencies", "build-dependencies"];

const decodeFields = Schema.decodeUnknownOption(Schema.Record(Schema.String, Schema.Unknown));
const decodeJson = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Unknown));
const decodeString = Schema.decodeUnknownOption(Schema.String);
const decodeVersioned = Schema.decodeUnknownOption(Schema.Struct({ version: Schema.String }));

const decodeSpec = (value: unknown): Option.Option<string> =>
  Option.orElse(decodeString(value), () =>
    Option.map(decodeVersioned(value), ({ version }) => version),
  );

const PackageManager = Schema.String.check(Schema.isPattern(/^[^@]+@[^+]+/u));

const decodePackageManager = Schema.decodeUnknownOption(PackageManager);

const fieldsOf = (value: unknown): Fields => Option.getOrElse(decodeFields(value), () => ({}));

const fieldOf =
  (name: string) =>
  (value: unknown): unknown =>
    fieldsOf(value)[name];

const entriesIn =
  (section: string) =>
  (held: unknown): readonly VersionEntry[] =>
    pipe(
      Rec.toEntries(fieldsOf(held)),
      Arr.flatMap(([name, value]) =>
        pipe(
          decodeSpec(value),
          Option.map((spec) => ({ key: `${section}:${name}`, name, spec })),
          Option.toArray,
        ),
      ),
    );

const sectionsIn =
  (sections: readonly string[]) =>
  (fields: Fields): readonly VersionEntry[] =>
    pipe(
      sections,
      Arr.flatMap((section) => entriesIn(section)(fields[section])),
    );

const packageManagerOf = (value: unknown): readonly VersionEntry[] =>
  pipe(
    decodePackageManager(value),
    Option.map((raw) => {
      const [name, version = ""] = Str.split(raw, "@");
      return { key: `packageManager:${name}`, name, spec: version };
    }),
    Option.toArray,
  );

export const manifestEntries = (text: string): readonly VersionEntry[] => {
  const manifest = fieldsOf(Option.getOrUndefined(decodeJson(text)));
  return [
    ...sectionsIn(MANIFEST_SECTIONS)(manifest),
    ...packageManagerOf(manifest["packageManager"]),
  ];
};

const catalogsIn = (held: unknown): readonly VersionEntry[] =>
  pipe(
    Rec.toEntries(fieldsOf(held)),
    Arr.flatMap(([name, catalog]) => entriesIn(`catalogs.${name}`)(catalog)),
  );

export const workspaceEntries = (text: string): readonly VersionEntry[] => {
  const settings = fieldsOf(
    Option.getOrUndefined(Option.liftThrowable(() => parse(text) as unknown)()),
  );
  return [...sectionsIn(["catalog", "overrides"])(settings), ...catalogsIn(settings["catalogs"])];
};

const parseToml = (text: string): Fields =>
  pipe(
    Option.liftThrowable(() => getStaticTOMLValue(parseTOML(text)))(),
    Option.map(fieldsOf),
    Option.getOrElse(() => ({})),
  );

const singleEntry = (key: string, value: unknown): readonly VersionEntry[] =>
  pipe(
    decodeSpec(value),
    Option.map((spec) => ({ key, name: key, spec })),
    Option.toArray,
  );

export const cargoEntries = (text: string): readonly VersionEntry[] => {
  const cargo = parseToml(text);
  return [
    ...sectionsIn(CARGO_SECTIONS)(cargo),
    ...entriesIn("workspace.dependencies")(fieldOf("dependencies")(cargo["workspace"])),
    ...singleEntry("rust-version", fieldOf("rust-version")(cargo["package"])),
  ];
};

export const toolchainEntries = (text: string): readonly VersionEntry[] =>
  singleEntry("channel", fieldOf("channel")(parseToml(text)["toolchain"]));
