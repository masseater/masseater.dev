import { escapeXml, validateGeneratedSet } from "ableton-als";
import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";

import { withMix } from "./als-mix.test.support.ts";
import type { MixSpec } from "./als-mix.test.support.ts";
import { FIRST, indexIn, timeOf } from "./als-xml.test.support.ts";

export interface NoteSpec {
  readonly time: number;
  readonly duration: number;
  readonly key: number;
  readonly velocity?: number;
  readonly off?: number;
  readonly enabled?: boolean;
}

export interface ClipSpec {
  readonly start: number;
  readonly end: number;
  readonly loopStart: number;
  readonly loopEnd: number;
  readonly startRelative?: number;
  readonly loopOn: boolean;
  readonly disabled?: boolean;
  readonly notes: readonly NoteSpec[];
}

export interface TrackSpec {
  readonly name?: string;
  readonly clips: readonly ClipSpec[];
  readonly mix?: MixSpec;
}

export interface TempoSpec {
  readonly beat: number;
  readonly bpm: number;
}

export interface MeterSpec {
  readonly beat: number;
  readonly numerator: number;
  readonly denominator: number;
}

export interface LocatorSpec {
  readonly beat: number;
  readonly name: string;
}

export interface SetSpec {
  readonly tracks: readonly TrackSpec[];
  readonly tempo?: readonly TempoSpec[];
  readonly meters?: readonly MeterSpec[];
  readonly locators?: readonly LocatorSpec[];
}

export const LIVE_ELEVEN_TEMPLATE =
  "../features/convert-als/model/fixtures/als-parser/live11-template.als";
const TEMPO_ENVELOPE = '<PointeeId Value="8" />';
const METER_ENVELOPE = '<PointeeId Value="10" />';
const EMPTY_EVENTS = /<Events \/>/u;
const MIDI_TRACK = /<MidiTrack Id="\d+">/gu;
const UNNAMED = /<EffectiveName Value="[^"]*" \/>\s*<UserName Value="" \/>/u;
const EMPTY_LOCATORS = "<Locators>\n\t\t\t<Locators />";
const DEFAULT_VELOCITY = 100;
const NO_OFFSET = 0;
const FIRST_ID = 1;
const METER_IDS_PER_DENOMINATOR = 99;

const noteXml = (note: NoteSpec, id: number): string =>
  `<MidiNoteEvent Time="${String(note.time)}" Duration="${String(note.duration)}" Velocity="${String(note.velocity ?? DEFAULT_VELOCITY)}" VelocityDeviation="0" OffVelocity="${String(note.off ?? NO_OFFSET)}" Probability="1" IsEnabled="${String(note.enabled ?? true)}" NoteId="${String(id)}" />`;

const keyTrackXml =
  (notes: readonly NoteSpec[]) =>
  (key: number, index: number): string => {
    const events = pipe(
      notes,
      Arr.map((note, position) => ({ note, id: position + FIRST_ID })),
      Arr.filter(({ note }) => note.key === key),
      Arr.map(({ note, id }) => noteXml(note, id)),
      Arr.join(""),
    );
    return `<KeyTrack Id="${String(index)}"><Notes>${events}</Notes><MidiKey Value="${String(key)}" /></KeyTrack>`;
  };

const keyTracksXml = (notes: readonly NoteSpec[]): string =>
  pipe(
    notes,
    Arr.map((note) => note.key),
    Arr.dedupe,
    Arr.map(keyTrackXml(notes)),
    Arr.join(""),
  );

const clipXml = (clip: ClipSpec, id: number): string =>
  Arr.join(
    [
      `<MidiClip Id="${String(id)}" Time="${String(clip.start)}">`,
      '<LomId Value="0" /><LomIdView Value="0" />',
      `<CurrentStart Value="${String(clip.start)}" /><CurrentEnd Value="${String(clip.end)}" />`,
      `<Loop><LoopStart Value="${String(clip.loopStart)}" /><LoopEnd Value="${String(clip.loopEnd)}" />`,
      `<StartRelative Value="${String(clip.startRelative ?? NO_OFFSET)}" /><LoopOn Value="${String(clip.loopOn)}" />`,
      `<OutMarker Value="${String(clip.loopEnd)}" /><HiddenLoopStart Value="${String(clip.loopStart)}" />`,
      `<HiddenLoopEnd Value="${String(clip.loopEnd)}" /></Loop>`,
      '<Name Value="" /><Annotation Value="" /><Color Value="1" /><LaunchMode Value="0" />',
      '<LaunchQuantisation Value="0" /><TimeSignature><TimeSignatures><RemoteableTimeSignature Id="0">',
      '<Numerator Value="4" /><Denominator Value="4" /><Time Value="0" /></RemoteableTimeSignature>',
      "</TimeSignatures></TimeSignature><Envelopes><Envelopes /></Envelopes>",
      '<ScrollerTimePreserver><LeftTime Value="0" /><RightTime Value="8" /></ScrollerTimePreserver>',
      '<TimeSelection><AnchorTime Value="0" /><OtherTime Value="0" /></TimeSelection>',
      '<Legato Value="false" /><Ram Value="false" /><GrooveSettings><GrooveId Value="-1" /></GrooveSettings>',
      `<Disabled Value="${String(clip.disabled ?? false)}" /><VelocityAmount Value="0" />`,
      '<FollowAction><FollowTime Value="4" /><IsLinked Value="true" /><LoopIterations Value="1" />',
      '<FollowActionA Value="4" /><FollowActionB Value="0" /><FollowChanceA Value="100" />',
      '<FollowChanceB Value="0" /><JumpIndexA Value="1" /><JumpIndexB Value="1" />',
      '<FollowActionEnabled Value="false" /></FollowAction>',
      '<Grid><FixedNumerator Value="1" /><FixedDenominator Value="16" /><GridIntervalPixel Value="20" />',
      '<Ntoles Value="2" /><SnapToGrid Value="true" /><Fixed Value="false" /></Grid>',
      '<FreezeStart Value="0" /><FreezeEnd Value="0" /><IsWarped Value="true" /><TakeId Value="1" />',
      `<Notes><KeyTracks>${keyTracksXml(clip.notes)}</KeyTracks>`,
      "<PerNoteEventStore><EventLists /></PerNoteEventStore>",
      `<NoteIdGenerator><NextId Value="${String(clip.notes.length + FIRST_ID)}" /></NoteIdGenerator></Notes>`,
      '<BankSelectCoarse Value="-1" /><BankSelectFine Value="-1" /><ProgramChange Value="-1" />',
      '<NoteEditorFoldInZoom Value="-1" /><NoteEditorFoldInScroll Value="0" />',
      '<NoteEditorFoldOutZoom Value="575" /><NoteEditorFoldOutScroll Value="0" />',
      '<NoteEditorFoldScaleZoom Value="-1" /><NoteEditorFoldScaleScroll Value="0" />',
      '<ScaleInformation><RootNote Value="0" /><Name Value="Major" /></ScaleInformation>',
      '<IsInKey Value="false" /><NoteSpellingPreference Value="0" /><PreferFlatRootNote Value="false" />',
      '<ExpressionGrid><FixedNumerator Value="1" /><FixedDenominator Value="16" />',
      '<GridIntervalPixel Value="20" /><Ntoles Value="2" /><SnapToGrid Value="false" />',
      '<Fixed Value="false" /></ExpressionGrid></MidiClip>',
    ],
    "",
  );

const withName = (rest: string, name: Option.Option<string>): string =>
  Option.match(name, {
    onNone: () => rest,
    onSome: (given) =>
      pipe(
        rest,
        Str.replace(
          UNNAMED,
          `<EffectiveName Value="${escapeXml(given)}" /><UserName Value="${escapeXml(given)}" />`,
        ),
      ),
  });

const withTrack = (xml: string, track: TrackSpec, index: number): string => {
  const opening = pipe(
    Arr.fromIterable(Str.matchAll(MIDI_TRACK)(xml)),
    Arr.get(index),
    Option.flatMap((match) => Option.fromUndefinedOr(match.index)),
    Option.getOrThrowWith(() => new Error(`The template has no MIDI track ${String(index)}`)),
  );
  const rest = pipe(xml, Str.slice(opening));
  const renamed = withName(rest, Option.fromUndefinedOr(track.name));
  const named = withMix({ xml: renamed, mix: Option.fromUndefinedOr(track.mix) });
  const timeable = indexIn({ text: named, search: "<ClipTimeable>", from: FIRST });
  const clips = pipe(track.clips, Arr.map(clipXml), Arr.join(""));
  const filled = pipe(
    named,
    Str.slice(timeable),
    Str.replace(EMPTY_EVENTS, `<Events>${clips}</Events>`),
  );
  return `${pipe(xml, Str.slice(FIRST, opening))}${pipe(named, Str.slice(FIRST, timeable))}${filled}`;
};

const withEnvelope = (xml: string, target: string, events: readonly string[]): string => {
  const found = indexIn({ text: xml, search: target, from: FIRST });
  const start = indexIn({ text: xml, search: "<Events>", from: found });
  const end = indexIn({ text: xml, search: "</Events>", from: start });
  return `${pipe(xml, Str.slice(FIRST, start))}<Events>${Arr.join(events, "")}${pipe(xml, Str.slice(end))}`;
};

const meterId = (numerator: number, denominator: number): number =>
  METER_IDS_PER_DENOMINATOR * Math.log2(denominator) + numerator - FIRST_ID;

const tempoEvent = (tempo: TempoSpec, id: number): string =>
  `<FloatEvent Id="${String(id)}" Time="${String(timeOf({ beat: tempo.beat, id }))}" Value="${String(tempo.bpm)}" />`;

const meterEvent = (meter: MeterSpec, id: number): string =>
  `<EnumEvent Id="${String(id)}" Time="${String(timeOf({ beat: meter.beat, id }))}" Value="${String(meterId(meter.numerator, meter.denominator))}" />`;

const locatorXml = (locator: LocatorSpec, id: number): string =>
  `<Locator Id="${String(id)}"><LomId Value="0" /><Time Value="${String(locator.beat)}" /><Name Value="${escapeXml(locator.name)}" /><Annotation Value="" /><IsSongStart Value="false" /></Locator>`;

const withEvents =
  <Item>(target: string, eventOf: (item: Item, id: number) => string) =>
  (xml: string, items: Option.Option<readonly Item[]>): string =>
    Option.match(items, {
      onNone: () => xml,
      onSome: (given) => withEnvelope(xml, target, pipe(given, Arr.map(eventOf))),
    });

const withLocators = (xml: string, locators: Option.Option<readonly LocatorSpec[]>): string =>
  Option.match(locators, {
    onNone: () => xml,
    onSome: (given) => {
      const events = pipe(given, Arr.map(locatorXml), Arr.join(""));
      return pipe(
        xml,
        Str.replace(EMPTY_LOCATORS, `<Locators>\n\t\t\t<Locators>${events}</Locators>`),
      );
    },
  });

const withTempo = withEvents(TEMPO_ENVELOPE, tempoEvent);
const withMeters = withEvents(METER_ENVELOPE, meterEvent);

const xmlOf = (template: string, spec: SetSpec): string => {
  let xml = template;
  for (const [index, track] of Arr.zip(Arr.range(FIRST, spec.tracks.length), spec.tracks)) {
    xml = withTrack(xml, track, index);
  }
  const tempo = withTempo(xml, Option.fromUndefinedOr(spec.tempo));
  const meters = withMeters(tempo, Option.fromUndefinedOr(spec.meters));
  return withLocators(meters, Option.fromUndefinedOr(spec.locators));
};

const textOfGzip = (bytes: Uint8Array): Effect.Effect<string> =>
  Effect.promise(() =>
    new Response(
      new Blob([Uint8Array.from(bytes)]).stream().pipeThrough(new DecompressionStream("gzip")),
    ).text(),
  );

const gzipOf = (text: string): Effect.Effect<Uint8Array> =>
  pipe(
    Effect.promise(() =>
      new Response(
        new Blob([text]).stream().pipeThrough(new CompressionStream("gzip")),
      ).arrayBuffer(),
    ),
    Effect.map((buffer) => new Uint8Array(buffer)),
  );

export const liveElevenSet = Effect.fn("liveElevenSet")(function* liveElevenSet(
  gzippedTemplate: Uint8Array,
  spec: SetSpec,
) {
  const template = yield* textOfGzip(gzippedTemplate);
  const xml = xmlOf(template, spec);
  const problems = validateGeneratedSet(xml);
  if (Arr.isReadonlyArrayNonEmpty(problems)) {
    const details = pipe(
      problems,
      Arr.map((problem) => problem.detail),
      Arr.join("\n"),
    );
    return yield* Effect.die(new Error(details));
  }
  return yield* gzipOf(xml);
});
