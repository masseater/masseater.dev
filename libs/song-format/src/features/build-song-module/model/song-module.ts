import { SongSchema, readSong } from "@r_masseater/fumx-parser";
import type { Song, Named, Outline, SongSource, SourceIssue } from "@r_masseater/fumx-parser";
import { Array as Arr, Effect, Option, Record as Rec, Schema, pipe } from "effect";
import { nameLiteral, quoted, text } from "mapped-import";
import type { Segment } from "mapped-import";
import type { Issue, Mapped } from "mapped-import/mapper";

export interface SongModuleSource<Failure> {
  readonly path: string;
  readonly content: string;
  readonly read: (path: string) => Effect.Effect<string, Failure>;
}

export interface SongModule {
  readonly mapped: Mapped;
  readonly song: Option.Option<Song>;
  readonly files: readonly string[];
}

type NamedField = {
  readonly [Field in keyof Song]: Song[Field] extends readonly { readonly name: string }[]
    ? Field
    : never;
}[keyof Song];

const NAMED_FIELDS = {
  samples: "Sample",
  kits: "Kit",
  instruments: "Instrument",
  buses: "Bus",
  tracks: "Track",
  plugins: "Plugin",
} as const satisfies Readonly<Record<NamedField, Named["$type"]>>;

const SONG_MODULE = "@r_masseater/fumx-parser";

const NEVER_SONG = "export declare const song: never;\n";

const titleSegments = (song: Song, outline: Outline): readonly Segment[] =>
  Option.match(outline.title, {
    onNone: () => [text(quoted(song.title))],
    onSome: ({ start, end }): readonly Segment[] => [
      { kind: "alias", text: quoted(song.title), start, end },
    ],
  });

const fieldSegments =
  (song: Song, outline: Outline) =>
  ([field, type]: readonly [NamedField, Named["$type"]]): readonly Segment[] => [
    text(`  readonly ${field}: readonly [\n`),
    ...pipe(
      song[field],
      Arr.flatMap(({ name }) => [
        text(`    Song["${field}"][number] & { readonly name: `),
        ...nameLiteral({
          name,
          span: pipe(
            outline.names,
            Arr.findFirst((found) => found.type === type && found.name === name),
            Option.map((found) => found.span),
          ),
        }),
        text(" },\n"),
      ]),
    ),
    text("  ];\n"),
  ];

const segmentsOf = (song: Song, outline: Outline): readonly Segment[] => [
  text(`import type { Song } from "${SONG_MODULE}";\n`),
  text("export declare const song: Song & {\n  readonly title: "),
  ...titleSegments(song, outline),
  text(";\n"),
  ...pipe(Rec.toEntries(NAMED_FIELDS), Arr.flatMap(fieldSegments(song, outline))),
  text("};\n"),
];

const issueOf =
  ({ path, outline }: Readonly<{ path: string; outline: Outline }>) =>
  (issue: SourceIssue): Issue => {
    if (issue.path === path) {
      return { message: issue.message, start: issue.start, end: issue.end };
    }
    const at = pipe(
      outline.imports,
      Arr.findFirst((found) => found.path === issue.path),
      Option.map((found) => found.span),
      Option.getOrElse(() => ({ start: 0, end: 0 })),
    );
    return {
      message: `${issue.path}:${String(issue.line)}:${String(issue.column)} ${issue.message}`,
      ...at,
    };
  };

const moduleOf =
  (path: string) =>
  (source: SongSource): SongModule => {
    if (source.status === "invalid") {
      return {
        mapped: {
          status: "error",
          fallback: NEVER_SONG,
          issues: pipe(source.issues, Arr.map(issueOf({ path, outline: source.outline }))),
        },
        song: Option.none(),
        files: source.outline.files,
      };
    }
    return {
      mapped: { status: "ok", segments: segmentsOf(source.song, source.outline) },
      song: Option.some(source.song),
      files: source.outline.files,
    };
  };

export const songModuleOf = <Failure>({
  path,
  content,
  read,
}: SongModuleSource<Failure>): Effect.Effect<SongModule> =>
  readSong({
    path,
    read: (target) => {
      if (target === path) {
        return Effect.succeed(content);
      }
      return read(target);
    },
  }).pipe(Effect.map(moduleOf(path)));

const encodeSong = Schema.encodeEffect(Schema.fromJsonString(SongSchema));

export const songCodeOf = (song: Song): Effect.Effect<string> =>
  encodeSong(song).pipe(
    Effect.orDie,
    Effect.map(
      (json) =>
        `import { Schema } from "effect";\nimport { SongSchema } from "${SONG_MODULE}";\nexport const song = Schema.decodeSync(Schema.fromJsonString(SongSchema))(${quoted(json)});\n`,
    ),
  );
