import { Array as Arr, Option, String as Str, pipe } from "effect";
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
export const COMMENT_CI_TOKEN = tokenFor("comment-ci-run");
export const STORING_EVENTS = ["schedule", "workflow_dispatch", "repository_dispatch"] as const;

export const eventToken = (event: string): string => tokenFor(`${event}-ci-run`);

const MAIN_RUN = { repository_visibility: "public", ref: "refs/heads/main" };

const RUNS = new Map<string, Readonly<Record<string, string>>>([
  [CI_TOKEN, MAIN_RUN],
  [COMMENT_CI_TOKEN, { ...MAIN_RUN, event_name: "issue_comment" }],
  ...pipe(
    STORING_EVENTS,
    Arr.map((event): [string, Readonly<Record<string, string>>] => [
      eventToken(event),
      { ...MAIN_RUN, event_name: event },
    ]),
  ),
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
