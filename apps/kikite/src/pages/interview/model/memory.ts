import { Option } from "effect";

import { readStored, writeStored } from "#/pages/interview/lib/stored";

const SPEAKER_KEY = "speaker";
const THEME_KEY = "theme";
const OFF = "off";
const ON = "on";

const storedSpeaker = (): boolean => Option.getOrElse(readStored(SPEAKER_KEY), () => ON) !== OFF;

const storedPrevious = (): Option.Option<string> => readStored(THEME_KEY);

const rememberSpeaker = (on: boolean): ReturnType<typeof writeStored> => {
  if (on) {
    return writeStored({ key: SPEAKER_KEY, value: ON });
  }
  return writeStored({ key: SPEAKER_KEY, value: OFF });
};

const rememberTheme = (theme: string): ReturnType<typeof writeStored> =>
  writeStored({ key: THEME_KEY, value: theme });

export { rememberSpeaker, rememberTheme, storedPrevious, storedSpeaker };
