import type { Option } from "effect";

import { readStored, writeStored } from "#/pages/interview/lib/stored";

const THEME_KEY = "theme";

export const storedPrevious = (): Option.Option<string> => readStored(THEME_KEY);

export const rememberTheme = (theme: string): ReturnType<typeof writeStored> =>
  writeStored({ key: THEME_KEY, value: theme });
