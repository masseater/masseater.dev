import { convertFileSrc } from "@tauri-apps/api/core";
import { String as Text } from "effect";

const SPECIAL = /[$()*+.?[\\\]^{|}/]/gu;

const origin = (scheme: string): RegExp => {
  const base = Text.replaceAll(SPECIAL, String.raw`\$&`)(convertFileSrc("", scheme));
  return new RegExp(`^${base}`, "u");
};

export const endpointOf = (signal: "traces" | "logs"): string =>
  `${convertFileSrc("", "otlp")}v1/${signal}`;

export const telemetryUrls = (): RegExp => origin("otlp");

export const commandUrls = (): RegExp => origin("ipc");
