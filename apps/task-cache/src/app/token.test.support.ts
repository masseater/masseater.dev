import { Option, String as Str, pipe } from "effect";
import { Base64Url } from "effect/encoding";

import type { VerifyToken } from "#/features/admit-caller/index.ts";

export const NAMESPACE = "repository";

const FAR_FUTURE = 4_102_444_800;
const HEADER = Base64Url.encode('{"alg":"RS256","typ":"JWT"}');
const SIGNATURE = Base64Url.encode("signature");

const tokenFor = (subject: string): string =>
  `${HEADER}.${Base64Url.encode(`{"exp":${String(FAR_FUTURE)},"sub":"${subject}"}`)}.${SIGNATURE}`;

export const CI_TOKEN = tokenFor("ci-run");
export const PRIVATE_CI_TOKEN = tokenFor("private-ci-run");
export const BRANCH_CI_TOKEN = tokenFor("branch-ci-run");

const RUNS = new Map([
  [CI_TOKEN, { repository_visibility: "public", ref: "refs/heads/main" }],
  [PRIVATE_CI_TOKEN, { repository_visibility: "private", ref: "refs/heads/main" }],
  [BRANCH_CI_TOKEN, { repository_visibility: "public", ref: "refs/heads/feature" }],
]);

export const verifyToken: VerifyToken = ({ token, audience }) => {
  const run = pipe(
    Option.fromNullishOr(RUNS.get(token)),
    Option.filter(() => Str.endsWith(`/projects/${NAMESPACE}`)(audience)),
  );
  return Option.match(run, {
    onNone: () => Promise.reject(new Error("invalid token")),
    onSome: (found) =>
      Promise.resolve({
        payload: {
          repository: `masseater/${NAMESPACE}`,
          repository_owner_id: "62135405",
          event_name: "push",
          ...found,
        },
      }),
  });
};
