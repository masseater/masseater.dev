import { convertFileSrc } from "@tauri-apps/api/core";

type Signal = "traces" | "logs";

const origin = (scheme: string): RegExp =>
  new RegExp(`^${RegExp.escape(convertFileSrc("", scheme))}`, "u");

export const endpointOf = (signal: Signal): string => `${convertFileSrc("", "otlp")}v1/${signal}`;

export const telemetryUrls = (): RegExp => origin("otlp");

export const commandUrls = (): RegExp => origin("ipc");
