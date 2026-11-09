import { Array as Arr, Option, Schema, pipe } from "effect";
import { WEB_ANALYTICS_SCRIPT_ORIGIN } from "security-headers";

const BEACON_VERSION = "v8c78df7c7c0f484497ecbca7046644da1771523124516";

const BEACON_INTEGRITY =
  "sha512-8DS7rgIrAmghBFwoOTujcf6D9rXvH8xm8JQ1Ja01h9QX8EzXldiszufYa4IFfKdLUKTTrnSFXLDkUEOTrZQ8Qg==";

const WEB_ANALYTICS_BEACON = {
  src: `${WEB_ANALYTICS_SCRIPT_ORIGIN}/beacon.min.js/${BEACON_VERSION}`,
  integrity: BEACON_INTEGRITY,
  crossOrigin: "anonymous",
} as const;

const webAnalyticsBeacon = (token: string) =>
  ({
    ...WEB_ANALYTICS_BEACON,
    defer: true,
    "data-cf-beacon": `{"token":"${token}"}`,
  }) as const;

const beaconScripts = (token: unknown): ReturnType<typeof webAnalyticsBeacon>[] =>
  pipe(
    Schema.decodeUnknownOption(Schema.NonEmptyString)(token),
    Option.map(webAnalyticsBeacon),
    Arr.fromOption,
  );

export { WEB_ANALYTICS_SCRIPT_ORIGIN } from "security-headers";
export { WEB_ANALYTICS_BEACON, beaconScripts, webAnalyticsBeacon };
