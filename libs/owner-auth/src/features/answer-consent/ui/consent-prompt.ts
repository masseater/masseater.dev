import { Component } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Button } from "@masseater.dev/effect-ui";
import { Array as Arr, Option, Schema, pipe } from "effect";
import { AsyncResult } from "effect/reactivity";

import { consentView } from "#/features/answer-consent/model/consent.ts";
import type { ConsentView } from "#/features/answer-consent/model/consent.ts";

import { AnswerConsent } from "./answer-consent.ts";
import { ClientName } from "./client-name.ts";
import { ConsentPromptMessage } from "./consent-prompt-message.ts";

const ALLOW = "許可する";
const DENY = "拒否する";
const FAILED = "許可できませんでした";

const ConsentPromptDef = Html.component({
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
});

const detailRow = ConsentPromptDef.fragment(
  (html, { label, values }: ConsentView["details"][number]) =>
    html.div.key(label).children(
      html.dt.class("text-muted-foreground").children(label),
      pipe(
        values,
        Arr.map((value) => html.dd.key(value).class("font-mono break-all").children(value)),
      ),
    ),
);

const detailList = ConsentPromptDef.fragment((html, details: ConsentView["details"]) =>
  html.dl.class("flex flex-col gap-2 text-sm").children(
    pipe(
      details,
      Arr.map((row) => detailRow(html, row)),
    ),
  ),
);

const answerButtons = ConsentPromptDef.fragment(
  (html, { locked, allow }: Readonly<{ locked: boolean; allow: ConsentView["allow"] }>) =>
    html.div.class("flex gap-3").children(
      Button({
        html,
        props: { disabled: locked || allow === "disabled" },
        onPress: ConsentPromptMessage.ClickedAllow(),
      }).children(ALLOW),
      Button({
        html,
        variant: "outline",
        props: { disabled: locked },
        onPress: ConsentPromptMessage.ClickedDeny(),
      }).children(DENY),
    ),
);

export const ConsentPromptNoDeps = ConsentPromptDef.make({
  init: () => ({ status: "idle" }),
  update: {
    ClickedAllow: (step) =>
      step.evolve({ status: "pending" }).run(AnswerConsent.make({ accept: true })),
    ClickedDeny: (step) =>
      step.evolve({ status: "pending" }).run(AnswerConsent.make({ accept: false })),
    SucceededAnswerConsent: (step) => step.evolve({ status: "success" }),
    FailedAnswerConsent: (step) => step.evolve({ status: "error" }),
  },
  view: (html, model) => {
    const { name, details, allow } = consentView({
      clientId: html.props.clientId,
      clientName: AsyncResult.match(html.queries.client, {
        onInitial: () => Option.none(),
        onFailure: () => Option.none(),
        onSuccess: ({ value }) => Option.some(value),
      }),
      redirectUri: Option.fromUndefinedOr(html.props.redirectUri),
      requestedScope: Option.fromUndefinedOr(html.props.requestedScope),
    });
    const locked = model.status === "pending" || model.status === "success";
    return html.section
      .class("flex flex-col gap-4")
      .children(
        html.h1.class("text-2xl font-bold break-all").children(name),
        detailList(html, details),
        html.p(html.props.scope),
        answerButtons(html, { locked, allow }),
        model.status === "error" &&
          html.p.attr("role", "alert").class("text-destructive text-sm").children(FAILED),
      );
  },
});

export const ConsentPrompt = ConsentPromptNoDeps.pipe(
  Component.provide([ClientName.layer, AnswerConsent.layer]),
);
