import { Component } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Button } from "@masseater.dev/effect-ui";
import { Schema } from "effect";

import { PasskeyKind, PasskeyPanelMessage } from "./passkey-panel-message.ts";
import { StartPasskey } from "./start-passkey.ts";

/** @stability experimental */
// oxlint-disable-next-line effecttsgo/missing-pipeable-signature -- Effect UI components are called as (html, options)
export const PasskeyPanelNoDeps = Html.component({
  name: "PasskeyPanel",
  props: Schema.Struct({
    kind: PasskeyKind,
    title: Schema.String,
    label: Schema.String,
    done: Schema.String,
    failed: Schema.String,
  }),
  model: Schema.Struct({ status: Schema.Literals(["idle", "pending", "success", "error"]) }),
  message: PasskeyPanelMessage,
}).make({
  init: () => ({ status: "idle" }),
  update: {
    ClickedStart: (step) =>
      step.evolve({ status: "pending" }).run(StartPasskey.make({ kind: step.props.kind })),
    SucceededStartPasskey: (step) => step.evolve({ status: "success" }),
    FailedStartPasskey: (step) => step.evolve({ status: "error" }),
  },
  view: (html, model) =>
    html.section.class("flex flex-col gap-4").children(
      html.h1.class("text-2xl font-bold").children(html.props.title),
      Button({
        html,
        props: { disabled: model.status === "pending" || model.status === "success" },
        onPress: PasskeyPanelMessage.ClickedStart(),
      }).children(html.props.label),
      model.status === "success" && html.output(html.props.done),
      model.status === "error" &&
        html.p.attr("role", "alert").class("text-destructive text-sm").children(html.props.failed),
    ),
});

/** @stability experimental */
// oxlint-disable-next-line effecttsgo/missing-pipeable-signature -- Effect UI components are called as (html, options)
export const PasskeyPanel = PasskeyPanelNoDeps.pipe(Component.provide(StartPasskey.layer));
