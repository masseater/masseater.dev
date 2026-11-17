import { ProfileAuthor } from "#/entities/owner-profile/index.ts";
import type { ProfileRequest } from "#/entities/owner-profile/index.ts";
import { chatAnswer } from "#/shared/api/index.server.ts";
import type { ChatModel } from "#/shared/api/index.server.ts";

export const PROFILE_MODEL = "@cf/thinkingmachines/inkling-2-small";

export type ProfileModel = ChatModel;

const MAX_TOKENS = 40_000;

const AGENT = "profile-writer";

const inputsOf = (request: ProfileRequest): object => ({
  messages: [
    { role: "system", content: request.instructions },
    { role: "user", content: request.input },
  ],
  response_format: {
    type: "json_schema",
    json_schema: { name: request.step, strict: true, schema: request.format },
  },
  max_tokens: MAX_TOKENS,
  reasoning_effort: "low",
});

export const profileAuthorOf = (ai: ChatModel): ProfileAuthor["Service"] =>
  ProfileAuthor.of({
    write: (request) =>
      chatAnswer({
        ai,
        model: PROFILE_MODEL,
        agent: AGENT,
        prompt: `${AGENT}.${request.step}`,
        inputs: inputsOf(request),
      }),
  });
