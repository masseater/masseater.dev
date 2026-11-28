import {
  INTERNAL_ERROR,
  INVALID_PARAMS,
  ProtocolError,
  SdkError,
  SdkErrorCode,
} from "@modelcontextprotocol/client";
import type { CallToolResult } from "@modelcontextprotocol/client";
import { Option, pipe } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { findingOfCall, outcomeOfError, outcomeOfResult } from "./outcome.ts";
import type { Outcome } from "./outcome.ts";

const kindOf = (outcome: Outcome): Option.Option<string> =>
  pipe(
    findingOfCall({ host: "h.test", tool: "t", label: "valid", outcome }),
    Option.map(({ kind }) => kind),
  );

const kindOfError = (error: unknown): Option.Option<string> => kindOf(outcomeOfError(error));

const kindOfResult = (result: CallToolResult): Option.Option<string> =>
  kindOf(outcomeOfResult(result));

const sdk = (code: SdkErrorCode): SdkError => new SdkError(code, "message");

describe("outcomeOfError", () => {
  it("tells a timeout, a dropped connection and a broken contract apart", () => {
    expect(kindOfError(sdk(SdkErrorCode.RequestTimeout))).toStrictEqual(Option.some("mcp-hang"));
    expect(kindOfError(sdk(SdkErrorCode.ConnectionClosed))).toStrictEqual(Option.some("mcp-crash"));
    expect(kindOfError(sdk(SdkErrorCode.InvalidResult))).toStrictEqual(Option.some("mcp-contract"));
  });

  it("accepts a clean refusal of bad input and reports an internal error", () => {
    expect(kindOfError(new ProtocolError(INVALID_PARAMS, "bad"))).toStrictEqual(Option.none());
    expect(kindOfError(new ProtocolError(INTERNAL_ERROR, "boom"))).toStrictEqual(
      Option.some("mcp-server-error"),
    );
  });

  it("reports anything unknown as a server error", () => {
    expect(kindOfError("odd")).toStrictEqual(Option.some("mcp-server-error"));
  });
});

describe("outcomeOfResult", () => {
  it("accepts a result and an error that says what went wrong", () => {
    const said: CallToolResult = {
      isError: true,
      content: [{ type: "text", text: "limit is 1-50" }],
    };
    expect(kindOfResult({ content: [{ type: "text", text: "ok" }] })).toStrictEqual(Option.none());
    expect(kindOfResult(said)).toStrictEqual(Option.none());
  });

  it("reports an error that carries no message", () => {
    expect(kindOfResult({ isError: true, content: [] })).toStrictEqual(Option.some("mcp-contract"));
  });
});
