import type { Option } from "effect";

import type { GitHubEffect } from "#/features/zizmor/model/github.ts";

export interface Exchange {
  readonly method: "GET" | "POST";
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: Option.Option<{ readonly bytes: Uint8Array; readonly type: string }>;
}

export interface Reply {
  readonly status: number;
  readonly bytes: Uint8Array;
}

export type Transport = (exchange: Exchange) => GitHubEffect<Reply>;

export const AGENT = "fu4-presets";
