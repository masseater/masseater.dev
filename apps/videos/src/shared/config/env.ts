import { Config } from "effect";

export const VOICEVOX_URL = Config.String("VOICEVOX_URL").pipe(
  Config.withDefault("http://127.0.0.1:50021"),
);

export const REMOTION_BROWSER = Config.option(Config.String("REMOTION_BROWSER_EXECUTABLE"));

export const DOWNLOAD_BROWSER = Config.String("BROWSER_EXECUTABLE").pipe(
  Config.withDefault("/opt/pw-browsers/chromium"),
);
