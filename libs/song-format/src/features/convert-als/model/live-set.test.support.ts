import { readFileSync } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";

import { escapeXml, validateGeneratedSet } from "ableton-als";

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
}

export interface SetSpec {
  readonly tracks: readonly [TrackSpec, TrackSpec?];
  readonly tempo?: readonly (readonly [number, number])[];
  readonly meters?: readonly (readonly [number, number, number?])[];
  readonly locators?: readonly (readonly [number, string])[];
}

const TEMPLATE = new URL("./fixtures/als-parser/live11-template.als", import.meta.url);
const SONG_START = -63_072_000;
const TEMPO_ENVELOPE = '<PointeeId Value="8" />';
const METER_ENVELOPE = '<PointeeId Value="10" />';
const EMPTY_EVENTS = /<Events \/>/;

const noteXml = (note: NoteSpec, id: number): string =>
  `<MidiNoteEvent Time="${String(note.time)}" Duration="${String(note.duration)}" Velocity="${String(note.velocity ?? 100)}" VelocityDeviation="0" OffVelocity="${String(note.off ?? 0)}" Probability="1" IsEnabled="${String(note.enabled ?? true)}" NoteId="${String(id)}" />`;

const keyTracksXml = (notes: readonly NoteSpec[]): string => {
  const keys = [...new Set(notes.map((note) => note.key))];
  return keys
    .map((key, index) => {
      const events = notes
        .filter((note) => note.key === key)
        .map((note) => noteXml(note, notes.indexOf(note) + 1))
        .join("");
      return `<KeyTrack Id="${String(index)}"><Notes>${events}</Notes><MidiKey Value="${String(key)}" /></KeyTrack>`;
    })
    .join("");
};

const clipXml = (clip: ClipSpec, id: number): string =>
  [
    `<MidiClip Id="${String(id)}" Time="${String(clip.start)}">`,
    '<LomId Value="0" /><LomIdView Value="0" />',
    `<CurrentStart Value="${String(clip.start)}" /><CurrentEnd Value="${String(clip.end)}" />`,
    `<Loop><LoopStart Value="${String(clip.loopStart)}" /><LoopEnd Value="${String(clip.loopEnd)}" />`,
    `<StartRelative Value="${String(clip.startRelative ?? 0)}" /><LoopOn Value="${String(clip.loopOn)}" />`,
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
    `<NoteIdGenerator><NextId Value="${String(clip.notes.length + 1)}" /></NoteIdGenerator></Notes>`,
    '<BankSelectCoarse Value="-1" /><BankSelectFine Value="-1" /><ProgramChange Value="-1" />',
    '<NoteEditorFoldInZoom Value="-1" /><NoteEditorFoldInScroll Value="0" />',
    '<NoteEditorFoldOutZoom Value="575" /><NoteEditorFoldOutScroll Value="0" />',
    '<NoteEditorFoldScaleZoom Value="-1" /><NoteEditorFoldScaleScroll Value="0" />',
    '<ScaleInformation><RootNote Value="0" /><Name Value="Major" /></ScaleInformation>',
    '<IsInKey Value="false" /><NoteSpellingPreference Value="0" /><PreferFlatRootNote Value="false" />',
    '<ExpressionGrid><FixedNumerator Value="1" /><FixedDenominator Value="16" />',
    '<GridIntervalPixel Value="20" /><Ntoles Value="2" /><SnapToGrid Value="false" />',
    '<Fixed Value="false" /></ExpressionGrid></MidiClip>',
  ].join("");

const withTrack = (xml: string, index: number, track: TrackSpec): string => {
  const opening = [...xml.matchAll(/<MidiTrack Id="\d+">/g)][index];
  if (opening?.index === undefined) {
    throw new Error(`The template has no MIDI track ${String(index)}`);
  }
  const head = xml.slice(0, opening.index);
  const rest = xml.slice(opening.index);
  const named =
    track.name === undefined
      ? rest
      : rest.replace(
          /<EffectiveName Value="[^"]*" \/>\s*<UserName Value="" \/>/,
          `<EffectiveName Value="${escapeXml(track.name)}" /><UserName Value="${escapeXml(track.name)}" />`,
        );
  const timeable = named.indexOf("<ClipTimeable>");
  const clips = track.clips.map((clip, id) => clipXml(clip, id)).join("");
  const filled =
    named.slice(0, timeable) +
    named.slice(timeable).replace(EMPTY_EVENTS, `<Events>${clips}</Events>`);
  return head + filled;
};

const withEnvelope = (xml: string, target: string, events: readonly string[]): string => {
  const at = xml.indexOf(target);
  const start = xml.indexOf("<Events>", at);
  const end = xml.indexOf("</Events>", start);
  return `${xml.slice(0, start)}<Events>${events.join("")}${xml.slice(end)}`;
};

const meterId = (numerator: number, denominator: number): number =>
  99 * Math.log2(denominator) + numerator - 1;

export const liveElevenSet = (spec: SetSpec): Uint8Array => {
  const template = gunzipSync(readFileSync(TEMPLATE)).toString("utf8");
  const tracks = spec.tracks.reduce(
    (xml, track, index) => (track === undefined ? xml : withTrack(xml, index, track)),
    template,
  );
  const tempo =
    spec.tempo === undefined
      ? tracks
      : withEnvelope(
          tracks,
          TEMPO_ENVELOPE,
          spec.tempo.map(
            ([beat, bpm], id) =>
              `<FloatEvent Id="${String(id)}" Time="${String(id === 0 ? SONG_START : beat)}" Value="${String(bpm)}" />`,
          ),
        );
  const meters =
    spec.meters === undefined
      ? tempo
      : withEnvelope(
          tempo,
          METER_ENVELOPE,
          spec.meters.map(
            ([beat, numerator, denominator = 4], id) =>
              `<EnumEvent Id="${String(id)}" Time="${String(id === 0 ? SONG_START : beat)}" Value="${String(meterId(numerator, denominator))}" />`,
          ),
        );
  const xml =
    spec.locators === undefined
      ? meters
      : meters.replace(
          "<Locators>\n\t\t\t<Locators />",
          `<Locators>\n\t\t\t<Locators>${spec.locators
            .map(
              ([beat, name], id) =>
                `<Locator Id="${String(id)}"><LomId Value="0" /><Time Value="${String(beat)}" /><Name Value="${escapeXml(name)}" /><Annotation Value="" /><IsSongStart Value="false" /></Locator>`,
            )
            .join("")}</Locators>`,
        );
  const problems = validateGeneratedSet(xml);
  if (problems.length > 0) {
    throw new Error(problems.map((problem) => problem.detail).join("\n"));
  }
  return gzipSync(xml);
};
