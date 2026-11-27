import { MIXER_PARAMETERS } from "@r_masseater/fumx-parser";
import { Array as Arr, Option, pipe } from "effect";

import type {
  BusMix,
  Envelope,
  Level,
  Mix,
  MixParameter,
  MixPoint,
  TrackMix,
  TrackSend,
} from "#/entities/timeline/index.ts";
import type { From } from "#/shared/lib/from.ts";

import type { AlsMidiTrack, AlsMixer, AlsReturnTrack, LiveSet, Parameter } from "./live-set.ts";
import { SONG_START, envelopeOf } from "./tempo-map.ts";
import type { Automated } from "./tempo-map.ts";
import { tickOf } from "./ticks.ts";

const DECIBELS_PER_DECADE = 20;
const SILENT_DECIBELS = -70;
const AUDIBLE_SEND = 0.001;
const NONE = 0;
const NEXT = 1;

const DECIMAL_BASE = 10;
const SILENT = DECIMAL_BASE ** (SILENT_DECIBELS / DECIBELS_PER_DECADE);

const decibelsOf: From<number, number> = (gain) =>
  DECIBELS_PER_DECADE * Math.log10(Math.max(gain, SILENT));

const [VOLUME, PAN] = MIXER_PARAMETERS;

const VALUES: Readonly<Record<MixParameter, From<number, number>>> = {
  volume: decibelsOf,
  pan: (pan) => pan,
};

const RESTING: Readonly<Record<MixParameter, number>> = { volume: NONE, pan: NONE };

type Owned = Readonly<{ owner: Automated; parameter: MixParameter }>;

const pointsOf =
  ({ owner, parameter }: Owned): From<Parameter, readonly MixPoint[]> =>
  (control) =>
    pipe(
      envelopeOf(owner)(control),
      Arr.map((event) => ({
        tick: tickOf(Math.max(event.Time, SONG_START)).tick,
        value: VALUES[parameter](Number(event.Value)),
      })),
      Arr.filter((point) => Number.isFinite(point.value)),
    );

const startOf =
  (owned: Owned): From<Parameter, number> =>
  (control) =>
    pipe(
      pointsOf(owned)(control),
      Arr.head,
      Option.map((point) => point.value),
      Option.orElse(() =>
        pipe(
          Option.fromUndefinedOr(control.Manual),
          Option.map((manual) => VALUES[owned.parameter](manual.Value)),
        ),
      ),
      Option.getOrElse(() => RESTING[owned.parameter]),
    );

const levelOf =
  (owner: Automated): From<AlsMixer, Level> =>
  (mixer) => ({
    decibels: startOf({ owner, parameter: VOLUME })(mixer.Volume),
    pan: startOf({ owner, parameter: PAN })(mixer.Pan),
    muted: pipe(
      Option.fromUndefinedOr(mixer.Speaker),
      Option.flatMap((speaker) => Option.fromUndefinedOr(speaker.Manual)),
      Option.exists((manual) => manual.Value === "false"),
    ),
  });

const sendsOf: From<AlsMixer, readonly TrackSend[]> = (mixer) =>
  pipe(
    Option.fromUndefinedOr(mixer.Sends),
    Option.flatMap((sends) => Option.fromUndefinedOr(sends.TrackSendHolder)),
    Option.getOrElse(() => []),
    Arr.map((holder, bus) => ({
      bus,
      amount: pipe(
        Option.fromUndefinedOr(holder.Send.Manual),
        Option.match({ onNone: () => NONE, onSome: (manual) => manual.Value }),
      ),
    })),
    Arr.filter((send) => send.amount > AUDIBLE_SEND),
  );

const envelopesOf =
  (owner: Automated): From<AlsMixer, readonly Envelope[]> =>
  (mixer) =>
    pipe(
      [
        { parameter: "volume" as const, control: mixer.Volume },
        { parameter: "pan" as const, control: mixer.Pan },
      ],
      Arr.map(({ parameter, control }) => ({
        parameter,
        points: pointsOf({ owner, parameter })(control),
      })),
      Arr.filter((envelope) => envelope.points.length > NEXT),
    );

const trackMixOf: From<AlsMidiTrack, Option.Option<TrackMix>> = (track) =>
  pipe(
    Option.fromUndefinedOr(track.DeviceChain.Mixer),
    Option.map((mixer) => ({
      level: levelOf(track)(mixer),
      sends: sendsOf(mixer),
      envelopes: envelopesOf(track)(mixer),
    })),
  );

const NO_ENVELOPES: Automated = {};

const busOf =
  (nameOf: From<AlsReturnTrack["Name"], Option.Option<string>>): From<AlsReturnTrack, BusMix> =>
  (track) => ({
    name: nameOf(track.Name),
    level: pipe(
      Option.fromUndefinedOr(track.DeviceChain.Mixer),
      Option.match({
        onNone: () => ({ decibels: NONE, pan: NONE, muted: false }),
        onSome: levelOf(NO_ENVELOPES),
      }),
    ),
  });

export const mixOf =
  (nameOf: From<AlsReturnTrack["Name"], Option.Option<string>>): From<LiveSet, Mix> =>
  (liveSet) => ({
    tracks: new Map(
      pipe(
        liveSet.Tracks.MidiTrack ?? [],
        Arr.flatMap((track, index) =>
          pipe(
            trackMixOf(track),
            Option.map((mix) => [index, mix] as const),
            Option.toArray,
          ),
        ),
      ),
    ),
    buses: pipe(liveSet.Tracks.ReturnTrack ?? [], Arr.map(busOf(nameOf))),
  });
