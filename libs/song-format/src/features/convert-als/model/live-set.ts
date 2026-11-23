import { Effect, Schema } from "effect";
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
  isArray: (name) => REPEATED.has(name),
});

const Num = Schema.Struct({ Value: Schema.FiniteFromString });
const Text = Schema.Struct({ Value: Schema.String });
const Flag = Schema.Struct({ Value: Schema.Literals(["true", "false"]) });

const EventSchema = Schema.Struct({ Time: Schema.FiniteFromString, Value: Schema.String });

export type AutomationEvent = typeof EventSchema.Type;

const EventsSchema = Schema.Struct({
  FloatEvent: Schema.optionalKey(Schema.Array(EventSchema)),
  EnumEvent: Schema.optionalKey(Schema.Array(EventSchema)),
  BoolEvent: Schema.optionalKey(Schema.Array(EventSchema)),
});

const EnvelopeSchema = Schema.Struct({
  EnvelopeTarget: Schema.Struct({ PointeeId: Num }),
  Automation: Schema.Struct({ Events: EventsSchema }),
});

export type Envelope = typeof EnvelopeSchema.Type;

const EnvelopesSchema = Schema.Struct({
  Envelopes: Schema.Struct({
    AutomationEnvelope: Schema.optionalKey(Schema.Array(EnvelopeSchema)),
  }),
});

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

const KeyTrackSchema = Schema.Struct({
  Notes: Schema.Struct({ MidiNoteEvent: Schema.optionalKey(Schema.Array(NoteSchema)) }),
  MidiKey: Num,
});

const ClipSchema = Schema.Struct({
  CurrentStart: Num,
  CurrentEnd: Num,
  Loop: Schema.Struct({
    LoopStart: Num,
    LoopEnd: Num,
    StartRelative: Num,
    LoopOn: Flag,
  }),
  Disabled: Schema.optionalKey(Flag),
  Notes: Schema.Struct({
    KeyTracks: Schema.Struct({ KeyTrack: Schema.optionalKey(Schema.Array(KeyTrackSchema)) }),
  }),
});

export type AlsClip = typeof ClipSchema.Type;

const NameSchema = Schema.Struct({
  EffectiveName: Schema.optionalKey(Text),
  UserName: Schema.optionalKey(Text),
});

const DevicesSchema = Schema.Struct({
  Devices: Schema.optionalKey(
    Schema.Struct({ DrumGroupDevice: Schema.optionalKey(Schema.Unknown) }),
  ),
});

const MidiTrackSchema = Schema.Struct({
  Id: Schema.String,
  Name: NameSchema,
  DeviceChain: Schema.Struct({
    DeviceChain: Schema.optionalKey(DevicesSchema),
    MainSequencer: Schema.Struct({
      ClipTimeable: Schema.Struct({
        ArrangerAutomation: Schema.Struct({
          Events: Schema.Struct({ MidiClip: Schema.optionalKey(Schema.Array(ClipSchema)) }),
        }),
      }),
    }),
  }),
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

const LiveSetSchema = Schema.Struct({
  Tracks: Schema.Struct({ MidiTrack: Schema.optionalKey(Schema.Array(MidiTrackSchema)) }),
  MasterTrack: Schema.optionalKey(MasterSchema),
  MainTrack: Schema.optionalKey(MasterSchema),
  Locators: Schema.optionalKey(
    Schema.Struct({
      Locators: Schema.Struct({ Locator: Schema.optionalKey(Schema.Array(LocatorSchema)) }),
    }),
  ),
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

export type AlsDocument = typeof DocumentSchema.Type;

const decodeDocument = Schema.decodeUnknownEffect(DocumentSchema);

const flattened = (node: unknown): unknown => {
  if (node === "") {
    return {};
  }
  if (Array.isArray(node)) {
    return node.map(flattened);
  }
  if (typeof node === "object" && node !== null) {
    const { [ATTRIBUTES]: attributes, ...children } = node as Record<string, unknown>;
    return {
      ...Object.fromEntries(
        Object.entries(children).map(([key, value]) => [key, flattened(value)]),
      ),
      ...(attributes as Record<string, string> | undefined),
    };
  }
  return node;
};

const gunzip = (bytes: Uint8Array) =>
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
