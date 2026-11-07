import { Option, pipe, Schema } from "effect";

const WEB_ANALYTICS_SCRIPT_ORIGIN = "https://static.cloudflareinsights.com";

const encodeBeaconJson = Schema.encodeUnknownOption(Schema.fromJsonString(Schema.Unknown));

const webAnalyticsBeacon = (token: string) =>
  ({
    src: `${WEB_ANALYTICS_SCRIPT_ORIGIN}/beacon.min.js`,
    defer: true,
    "data-cf-beacon": pipe(
      encodeBeaconJson({ token }),
      Option.getOrElse(() => ""),
    ),
  }) as const;

export { webAnalyticsBeacon };
