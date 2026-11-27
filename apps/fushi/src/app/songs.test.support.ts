import { Array as Arr } from "effect";

const chord = (bass: string, pad: string): string =>
  `bar meter 4/4 tempo 120bpm {\n  bass: ${bass} 1/1\n  pad: ${pad} 1/1\n}`;

const TONIC = chord("C2", "[C3 E3 G3]");
const FLAT_SEVEN = chord("Bb1", "[D3 F3 Bb3]");
const FOUR = chord("F2", "[C3 F3 A3]");
const FIVE = chord("G2", "[D3 G3 B3]");

const NEWLINE = "\n";

const songText = (title: string, bars: readonly string[]): string =>
  `song "${title}"\n\ninstrument keys sample "keys.flac" root C4\n\ntrack pad instrument keys role harmony\ntrack bass instrument keys role bass\n\n${Arr.join(bars, NEWLINE)}\n`;

export const SONG_FILES: readonly File[] = [
  new File(
    [songText("夜明け", [TONIC, FLAT_SEVEN, FOUR, TONIC, FIVE, TONIC, FLAT_SEVEN, FOUR, TONIC])],
    "夜明け.fumx",
  ),
  new File(
    [songText("坂道", [TONIC, FOUR, TONIC, FIVE, TONIC, FLAT_SEVEN, FOUR, TONIC])],
    "坂道.fumx",
  ),
];

export const HABIT = "I V I → bVII";
