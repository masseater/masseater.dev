import { bassBar, bassNote } from "./bass.ts";
import type { Life } from "./context.ts";
import { organBar, organHit, pianoChord } from "./keys.ts";
import { padChord } from "./pad.ts";
import { pasted } from "./pasted.ts";

export const tonalEvents = (
  life: Life,
): Readonly<{
  bassBar: ReturnType<typeof bassBar>;
  bassNote: ReturnType<typeof bassNote>;
  organBar: ReturnType<typeof organBar>;
  organHit: ReturnType<typeof organHit>;
  piano: ReturnType<typeof pianoChord>;
  pad: ReturnType<typeof padChord>;
  paste: ReturnType<typeof pasted>;
  random: () => void;
}> => ({
  bassBar: bassBar(life),
  bassNote: bassNote(life),
  organBar: organBar(life),
  organHit: organHit(life),
  piano: pianoChord(life),
  pad: padChord(life),
  paste: pasted(life),
  random: () => {
    life.random();
  },
});
