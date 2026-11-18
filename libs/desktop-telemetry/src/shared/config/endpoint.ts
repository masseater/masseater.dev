import { convertFileSrc } from "@tauri-apps/api/core";

const origin = (scheme: string): RegExp =>
  new RegExp(`^${RegExp.escape(convertFileSrc("", scheme))}`, "u");

export const endpointOf = (signal: "traces" | "logs"): string =>
  `${convertFileSrc("", "otlp")}v1/${signal}`;

export const telemetryUrls = (): RegExp => origin("otlp");

export const commandUrls = (): RegExp => origin("ipc");
