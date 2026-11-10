import { Array as Arr, Option, Schema } from "effect";

import { Package } from "#src/attw.ts";

import expectedJson from "./expected.json" with { type: "json" };
import fixturesJson from "./fixtures.json" with { type: "json" };

const Fixture = Schema.Struct({
  name: Schema.String,
  packageName: Schema.String,
  packageVersion: Schema.String,
  resolvedUrl: Schema.String,
  typesPackage: Schema.optional(
    Schema.Struct({ packageName: Schema.String, packageVersion: Schema.String }),
  ),
  files: Schema.Record(Schema.String, Schema.String),
});

const HostLookup = Schema.Struct({
  fixture: Schema.String,
  moduleResolution: Schema.Number,
  moduleName: Schema.String,
  containingFile: Schema.String,
  mode: Schema.Number,
  noDtsResolution: Schema.Boolean,
});

const Fixtures = Schema.Struct({
  fixtures: Schema.Array(Fixture),
  paths: Schema.Array(Schema.String),
  hostLookups: Schema.Array(HostLookup),
  packageNames: Schema.Array(Schema.String),
});

const ExpectedPath = Schema.Struct({
  path: Schema.String,
  rootLength: Schema.Number,
  normalized: Schema.String,
  absolute: Schema.String,
  directory: Schema.String,
  combined: Schema.String,
  components: Schema.Array(Schema.String),
});

const ExpectedLookup = Schema.Struct({
  ...HostLookup.fields,
  resolution: Schema.Unknown,
  trace: Schema.Array(Schema.String),
});

const ExpectedPackageName = Schema.Struct({
  name: Schema.String,
  mangled: Schema.String,
  unmangled: Schema.String,
  typesPackage: Schema.String,
});

const Expected = Schema.Struct({
  packages: Schema.Record(Schema.String, Schema.Unknown),
  paths: Schema.Array(ExpectedPath),
  hostLookups: Schema.Array(ExpectedLookup),
  packageNames: Schema.Array(ExpectedPackageName),
});

type FixtureData = typeof Fixture.Type;
type ExpectedLookupData = typeof ExpectedLookup.Type;
type ExpectedPathData = typeof ExpectedPath.Type;
type ExpectedPackageNameData = typeof ExpectedPackageName.Type;

const undecodable = (): TypeError => new TypeError("The differential test data does not decode");

const inputs = Schema.decodeUnknownOption(Fixtures)(fixturesJson).pipe(
  Option.getOrThrowWith(undecodable),
);

const expected = Schema.decodeUnknownOption(Expected)(expectedJson).pipe(
  Option.getOrThrowWith(undecodable),
);

const asJson = (value: object): unknown => {
  const serialized = JSON.stringify(value);
  return JSON.parse(serialized);
};

const packageOf = (fixture: FixtureData): Package =>
  new Package(
    { ...fixture.files },
    fixture.packageName,
    fixture.packageVersion,
    fixture.resolvedUrl,
    fixture.typesPackage,
  );

const fixtureNamed = (name: string): FixtureData =>
  Arr.findFirst(inputs.fixtures, (fixture) => fixture.name === name).pipe(
    Option.getOrThrowWith(() => new TypeError(`No fixture named ${name}`)),
  );

export { asJson, expected, fixtureNamed, inputs, packageOf };
export type { ExpectedLookupData, ExpectedPackageNameData, ExpectedPathData, FixtureData };
