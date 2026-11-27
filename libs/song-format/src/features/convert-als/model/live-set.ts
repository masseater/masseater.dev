import { Array as Arr, Effect, Option, Record as Rec, Schema, pipe } from "effect";
import { XMLParser } from "fast-xml-parser";

const taggedError = Schema.TaggedError;

export class UnreadableAls extends taggedError<UnreadableAls, { readonly brand: unique symbol }>()(
  "UnreadableAls",
  { message: Schema.String },
  { identifier: "UnreadableAls" },
) {}

const REPEATED = new Set([
  "MidiTrack",
  "AudioTrack",
  "GroupTrack",
  "ReturnTrack",
  "MidiClip",
  "AudioClip",
  "KeyTrack",
  "MidiNoteEvent",
  "Locator",
  "AutomationEnvelope",
  "FloatEvent",
  "EnumEvent",
  "BoolEvent",
  "TrackSendHolder",
]);

const ATTRIBUTES = "@";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  attributesGroupName: ATTRIBUTES,
  parseTagValue: false,
  parseAttributeValue: false,
  isArray: (name: string): boolean => REPEATED.has(name),
});

const Num = Schema.Struct({ Value: Schema.FiniteFromString });
const Text = Schema.Struct({ Value: Schema.String });
const Flag = Schema.Struct({ Value: Schema.Literals(["true", "false"]) });

const EventSchema = Schema.Struct({ Time: Schema.FiniteFromString, Value: Schema.String });

export type AutomationEvent = typeof EventSchema.Type;

const EventsSchema = Schema.Struct({
  FloatEvent: Schema.Array(EventSchema).pipe(Schema.optionalKey),
  EnumEvent: Schema.Array(EventSchema).pipe(Schema.optionalKey),
  BoolEvent: Schema.Array(EventSchema).pipe(Schema.optionalKey),
});

const EnvelopeSchema = Schema.Struct({
  EnvelopeTarget: Schema.Struct({ PointeeId: Num }),
  Automation: Schema.Struct({ Events: EventsSchema }),
});

export type AutomationEnvelope = typeof EnvelopeSchema.Type;

const EnvelopeListSchema = Schema.Struct({
  AutomationEnvelope: Schema.Array(EnvelopeSchema).pipe(Schema.optionalKey),
});

const EnvelopesSchema = Schema.Struct({ Envelopes: EnvelopeListSchema });

const TargetSchema = Schema.Struct({ Id: Schema.FiniteFromString });

const ParameterSchema = Schema.Struct({
  Manual: Schema.optionalKey(Num),
  AutomationTarget: Schema.optionalKey(TargetSchema),
  ArrangerAutomation: Schema.optionalKey(Schema.Struct({ Events: EventsSchema })),
});

export type Parameter = typeof ParameterSchema.Type;

const NoteSchema = Schema.Struct({
  Time: Schema.FiniteFromString,
  Duration: Schema.FiniteFromString,
  Velocity: Schema.FiniteFromString,
  OffVelocity: Schema.optionalKey(Schema.FiniteFromString),
  IsEnabled: Schema.optionalKey(Schema.Literals(["true", "false"])),
  Probability: Schema.optionalKey(Schema.FiniteFromString),
  VelocityDeviation: Schema.optionalKey(Schema.FiniteFromString),
});

const NoteListSchema = Schema.Struct({
  MidiNoteEvent: Schema.Array(NoteSchema).pipe(Schema.optionalKey),
});

const KeyTrackSchema = Schema.Struct({ Notes: NoteListSchema, MidiKey: Num });

const LoopSchema = Schema.Struct({
  LoopStart: Num,
  LoopEnd: Num,
  StartRelative: Num,
  LoopOn: Flag,
});

const KeyTracksSchema = Schema.Struct({
  KeyTrack: Schema.Array(KeyTrackSchema).pipe(Schema.optionalKey),
});

const ClipSchema = Schema.Struct({
  CurrentStart: Num,
  CurrentEnd: Num,
  Loop: LoopSchema,
  Disabled: Schema.optionalKey(Flag),
  Notes: Schema.Struct({ KeyTracks: KeyTracksSchema }),
});

export type AlsClip = typeof ClipSchema.Type;

const NameSchema = Schema.Struct({
  EffectiveName: Schema.optionalKey(Text),
  UserName: Schema.optionalKey(Text),
});

const DrumsSchema = Schema.Struct({ DrumGroupDevice: Schema.optionalKey(Schema.Unknown) });

const DevicesSchema = Schema.Struct({ Devices: Schema.optionalKey(DrumsSchema) });

const ClipEventsSchema = Schema.Struct({
  MidiClip: Schema.Array(ClipSchema).pipe(Schema.optionalKey),
});

const ArrangementSchema = Schema.Struct({
  ArrangerAutomation: Schema.Struct({ Events: ClipEventsSchema }),
});

const TrackChainSchema = Schema.Struct({
  DeviceChain: Schema.optionalKey(DevicesSchema),
  MainSequencer: Schema.Struct({ ClipTimeable: ArrangementSchema }),
});

const MidiTrackSchema = Schema.Struct({
  Id: Schema.String,
  Name: NameSchema,
  DeviceChain: TrackChainSchema,
});

export type AlsMidiTrack = typeof MidiTrackSchema.Type;

const MixerSchema = Schema.Struct({ Tempo: ParameterSchema, TimeSignature: ParameterSchema });

const MasterSchema = Schema.Struct({
  AutomationEnvelopes: Schema.optionalKey(EnvelopesSchema),
  DeviceChain: Schema.optionalKey(Schema.Struct({ Mixer: MixerSchema })),
  MasterChain: Schema.optionalKey(Schema.Struct({ Mixer: MixerSchema })),
});

export type AlsMaster = typeof MasterSchema.Type;

const LocatorSchema = Schema.Struct({ Time: Num, Name: Text });

export type AlsLocator = typeof LocatorSchema.Type;

const TracksSchema = Schema.Struct({
  MidiTrack: Schema.Array(MidiTrackSchema).pipe(Schema.optionalKey),
});

const LocatorListSchema = Schema.Struct({
  Locator: Schema.Array(LocatorSchema).pipe(Schema.optionalKey),
});

const LiveSetSchema = Schema.Struct({
  Tracks: TracksSchema,
  MasterTrack: Schema.optionalKey(MasterSchema),
  MainTrack: Schema.optionalKey(MasterSchema),
  Locators: Schema.optionalKey(Schema.Struct({ Locators: LocatorListSchema })),
});

export type LiveSet = typeof LiveSetSchema.Type;

const DocumentSchema = Schema.Struct({
  Ableton: Schema.Struct({
    MajorVersion: Schema.String,
    MinorVersion: Schema.String,
    Creator: Schema.optionalKey(Schema.String),
    LiveSet: LiveSetSchema,
  }),
});

const decodeDocument = Schema.decodeUnknownEffect(DocumentSchema);

const isElement = Schema.is(Schema.Record(Schema.String, Schema.Unknown));
const isAttributes = Schema.is(Schema.Record(Schema.String, Schema.String));

const flattened = (node: unknown): unknown => {
  if (node === "") {
    return {};
  }
  if (Arr.isArray(node)) {
    return pipe(
      node,
      Arr.map((child) => flattened(child)),
    );
  }
  if (isElement(node)) {
    const { [ATTRIBUTES]: attributes, ...children } = node;
    const own = pipe(
      Option.liftPredicate(attributes, isAttributes),
      Option.getOrElse((): Readonly<Record<string, string>> => ({})),
    );
    return {
      ...pipe(
        children,
        Rec.map((child) => flattened(child)),
      ),
      ...own,
    };
  }
  return node;
};

const gunzip = (bytes: Uint8Array): Effect.Effect<string, UnreadableAls> =>
  Effect.tryPromise({
    try: () =>
      new Response(
        new Blob([Uint8Array.from(bytes)]).stream().pipeThrough(new DecompressionStream("gzip")),
      ).text(),
    catch: (cause) => UnreadableAls.make({ message: `Not a gzipped Live Set: ${String(cause)}` }),
  });

export const readAlsDocument = Effect.fn("readAlsDocument")(function* read(bytes: Uint8Array) {
  const xml = yield* gunzip(bytes);
  const parsed = yield* Effect.try({
    try: () => flattened(parser.parse(xml)),
    catch: (cause) => UnreadableAls.make({ message: `Not XML: ${String(cause)}` }),
  });
  return yield* decodeDocument(parsed).pipe(
    Effect.mapError((issue) =>
      UnreadableAls.make({ message: `Not a Live Set this converter reads: ${String(issue)}` }),
    ),
  );
});
