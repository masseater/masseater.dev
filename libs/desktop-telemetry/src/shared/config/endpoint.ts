import { convertFileSrc } from "@tauri-apps/api/core";

const SCHEME = "otlp";

export type Signal = "traces" | "logs";

const base = (): string => convertFileSrc("", SCHEME);

export const endpointOf = (signal: Signal): string => `${base()}v1/${signal}`;

export const endpointPattern = (): RegExp => new RegExp(`^${RegExp.escape(base())}`, "u");
