import { Match } from "effect";

import { finding, findingIf, OK, isRefused } from "#/entities/exposure/index.ts";
import type { Finding, Probe, ProbeResult } from "#/entities/exposure/index.ts";

const answered = (probe: Probe, status: number, location: string): readonly Finding[] =>
  Match.value(probe.purpose).pipe(
    Match.when("oauth-discovery", () =>
      findingIf(status !== OK)(() =>
        finding({
          kind: "oauth-discovery",
          subject: probe.subject,
          detail: `${probe.url} が ${String(status)} を返し、MCP のクライアントが Access の OAuth を見つけられない`,
        }),
      ),
    ),
    Match.when("mcp", () =>
      findingIf(!isRefused({ status, location }))(() =>
        finding({
          kind: "open-mcp",
          subject: probe.subject,
          detail: `認証なしの ${probe.method} ${probe.url} が ${String(status)} を返した`,
        }),
      ),
    ),
    Match.when("access", () =>
      findingIf(!isRefused({ status, location }))(() =>
        finding({
          kind: "open-host",
          subject: probe.subject,
          detail: `認証なしの ${probe.method} ${probe.url} が ${String(status)} を返した`,
        }),
      ),
    ),
    Match.exhaustive,
  );

export const fromProbe = ({ probe, outcome }: ProbeResult): readonly Finding[] =>
  Match.value(outcome).pipe(
    Match.tagsExhaustive({
      Gone: () => [],
      Unreachable: ({ reason }) => [
        finding({
          kind: "unreachable",
          subject: probe.url,
          detail: `${probe.method} ${probe.url} に届かなかった（${reason}）`,
        }),
      ],
      Answered: ({ status, location }) => answered(probe, status, location),
    }),
  );
