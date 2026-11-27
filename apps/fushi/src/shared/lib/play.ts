import { Array as Arr, pipe } from "effect";

export type SnippetNote = Readonly<{ start: number; length: number; midi: number }>;

export type Snippet = Readonly<{ notes: readonly SnippetNote[]; bpm: number }>;

export type Playing = Readonly<{ fraction: () => number; stop: () => void }>;

const A4 = 69;
const A4_HZ = 440;
const OCTAVE = 2;
const SEMITONES = 12;
const SECONDS_PER_MINUTE = 60;
const LEAD = 0.05;
const ATTACK = 0.02;
const RELEASE = 0.06;
const LEVEL = 0.12;
const SILENT = 0;

const context = new AudioContext();

const hertzOf = (midi: number): number => A4_HZ * OCTAVE ** ((midi - A4) / SEMITONES);

type Span = Readonly<{ start: number; end: number }>;

const envelope = ({ start, end }: Span): GainNode => {
  const gain = new GainNode(context, { gain: SILENT });
  gain.gain.linearRampToValueAtTime(LEVEL, start + ATTACK);
  gain.gain.setValueAtTime(LEVEL, end - RELEASE);
  gain.gain.linearRampToValueAtTime(SILENT, end);
  gain.connect(context.destination);
  return gain;
};

type Voice = Readonly<{ note: SnippetNote; at: number; perBeat: number }>;

const voiced = ({ note, at, perBeat }: Voice): OscillatorNode => {
  const start = at + note.start * perBeat;
  const end = start + Math.max(note.length * perBeat, ATTACK + RELEASE);
  const oscillator = new OscillatorNode(context, {
    type: "triangle",
    frequency: hertzOf(note.midi),
  });
  oscillator.connect(envelope({ start, end }));
  oscillator.start(start);
  oscillator.stop(end + ATTACK);
  return oscillator;
};

const beatsOf = (snippet: Snippet): number =>
  Math.max(
    SILENT,
    ...pipe(
      snippet.notes,
      Arr.map((note) => note.start + note.length),
    ),
  );

export const playNotes = (snippet: Snippet): Playing => {
  const perBeat = SECONDS_PER_MINUTE / snippet.bpm;
  const at = context.currentTime + LEAD;
  const seconds = beatsOf(snippet) * perBeat;
  const voices = pipe(
    snippet.notes,
    Arr.map((note) => voiced({ note, at, perBeat })),
  );
  return {
    fraction: () => (context.currentTime - at) / seconds,
    stop: () => {
      for (const voice of voices) {
        voice.stop();
      }
    },
  };
};
