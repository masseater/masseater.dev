import { Command, Component, UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Button } from "@masseater.dev/effect-ui";
import { Effect, Schema } from "effect";

import { registerPasskey, signInWithPasskey } from "#/features/sign-in-passkey/model/flows.ts";

const PasskeyKind = Schema.Literals(["register", "sign-in"]);

export const PasskeyPanelMessage = UiSchema.TaggedEnum({
  ClickedStart: {},
  SucceededStartPasskey: {},
  FailedStartPasskey: {},
});

const FLOWS = { register: registerPasskey, "sign-in": signInWithPasskey } as const;

export class StartPasskey extends Command.Service<StartPasskey>()("sign-in-passkey/StartPasskey", {
  args: { kind: PasskeyKind },
  success: PasskeyPanelMessage,
}) {
  static readonly layer = this.toLayer(
    Effect.succeed(({ kind }) =>
      Effect.tryPromise(() => FLOWS[kind]()).pipe(
        Effect.match({
          onSuccess: () => PasskeyPanelMessage.SucceededStartPasskey(),
          onFailure: () => PasskeyPanelMessage.FailedStartPasskey(),
        }),
      ),
    ),
  );
}

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
    ClickedStart: ($) =>
      $.evolve({ status: "pending" }).run(StartPasskey.make({ kind: $.props.kind })),
    SucceededStartPasskey: ($) => $.evolve({ status: "success" }),
    FailedStartPasskey: ($) => $.evolve({ status: "error" }),
  },
  view: (h, model) =>
    h.section.class("flex flex-col gap-4").children(
      h.h1.class("text-2xl font-bold").children(h.props.title),
      Button(h, {
        props: { disabled: model.status === "pending" || model.status === "success" },
        onPress: PasskeyPanelMessage.ClickedStart(),
      }).children(h.props.label),
      model.status === "success" && h.output(h.props.done),
      model.status === "error" &&
        h.p.attr("role", "alert").class("text-destructive text-sm").children(h.props.failed),
    ),
});

export const PasskeyPanel = PasskeyPanelNoDeps.pipe(Component.provide(StartPasskey.layer));
