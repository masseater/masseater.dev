import { Command, Component, Query, UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Button } from "@masseater.dev/effect-ui";
import { Array as Arr, Effect, Option, Schema, pipe } from "effect";
import { AsyncResult } from "effect/reactivity";

import {
  answerConsent,
  consentView,
  fetchClientName,
} from "#/features/answer-consent/model/consent.ts";

const ALLOW = "許可する";
const DENY = "拒否する";
const FAILED = "許可できませんでした";

export const ConsentPromptMessage = UiSchema.TaggedEnum({
  ClickedAllow: {},
  ClickedDeny: {},
  SucceededAnswerConsent: {},
  FailedAnswerConsent: {},
});

export class ClientName extends Query.Service<ClientName>()("answer-consent/ClientName", {
  args: { clientId: Schema.String },
  success: Schema.String,
  staleTime: "30 seconds",
}) {
  static readonly layer = this.toLayer(
    Effect.succeed(({ clientId }) => Effect.promise(() => fetchClientName(clientId))),
  );
}

export class AnswerConsent extends Command.Service<AnswerConsent>()(
  "answer-consent/AnswerConsent",
  {
    args: { accept: Schema.Boolean },
    success: ConsentPromptMessage,
  },
) {
  static readonly layer = this.toLayer(
    Effect.succeed(({ accept }) =>
      Effect.tryPromise(() => answerConsent(accept)).pipe(
        Effect.match({
          onSuccess: () => ConsentPromptMessage.SucceededAnswerConsent(),
          onFailure: () => ConsentPromptMessage.FailedAnswerConsent(),
        }),
      ),
    ),
  );
}

export const ConsentPromptNoDeps = Html.component({
  name: "ConsentPrompt",
  props: Schema.Struct({
    scope: Schema.String,
    clientId: Schema.String,
    redirectUri: Schema.optional(Schema.String),
    requestedScope: Schema.optional(Schema.String),
  }),
  model: Schema.Struct({ status: Schema.Literals(["idle", "pending", "success", "error"]) }),
  message: ConsentPromptMessage,
  queries: { client: { query: ClientName, args: ({ props }) => ({ clientId: props.clientId }) } },
}).make({
  init: () => ({ status: "idle" }),
  update: {
    ClickedAllow: ($) => $.evolve({ status: "pending" }).run(AnswerConsent.make({ accept: true })),
    ClickedDeny: ($) => $.evolve({ status: "pending" }).run(AnswerConsent.make({ accept: false })),
    SucceededAnswerConsent: ($) => $.evolve({ status: "success" }),
    FailedAnswerConsent: ($) => $.evolve({ status: "error" }),
  },
  view: (h, model) => {
    const { name, details, allow } = consentView({
      clientId: h.props.clientId,
      clientName: AsyncResult.isSuccess(h.queries.client)
        ? Option.some(h.queries.client.value)
        : Option.none(),
      redirectUri: Option.fromUndefinedOr(h.props.redirectUri),
      requestedScope: Option.fromUndefinedOr(h.props.requestedScope),
    });
    const locked = model.status === "pending" || model.status === "success";
    return h.section.class("flex flex-col gap-4").children(
      h.h1.class("text-2xl font-bold break-all").children(name),
      h.dl.class("flex flex-col gap-2 text-sm").children(
        pipe(
          details,
          Arr.map(({ label, values }) =>
            h.div.key(label).children(
              h.dt.class("text-muted-foreground").children(label),
              pipe(
                values,
                Arr.map((value) => h.dd.key(value).class("font-mono break-all").children(value)),
              ),
            ),
          ),
        ),
      ),
      h.p(h.props.scope),
      h.div.class("flex gap-3").children(
        Button(h, {
          props: { disabled: locked || allow === "disabled" },
          onPress: ConsentPromptMessage.ClickedAllow(),
        }).children(ALLOW),
        Button(h, {
          variant: "outline",
          props: { disabled: locked },
          onPress: ConsentPromptMessage.ClickedDeny(),
        }).children(DENY),
      ),
      model.status === "error" &&
        h.p.attr("role", "alert").class("text-destructive text-sm").children(FAILED),
    );
  },
});

export const ConsentPrompt = ConsentPromptNoDeps.pipe(
  Component.provide([ClientName.layer, AnswerConsent.layer]),
);
