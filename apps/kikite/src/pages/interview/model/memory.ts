import type { Option } from "effect";

import { readStored, writeStored } from "#/pages/interview/lib/stored";

const THEME_KEY = "theme";

const storedPrevious = (): Option.Option<string> => readStored(THEME_KEY);

const rememberTheme = (theme: string): ReturnType<typeof writeStored> =>
  writeStored({ key: THEME_KEY, value: theme });

export { rememberTheme, storedPrevious };
