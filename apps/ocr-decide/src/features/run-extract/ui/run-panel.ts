import { Component } from "@effect/ui";
import type { View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Button, Icon } from "@masseater.dev/effect-ui";
import { Option } from "effect";
import { CircleX } from "lucide";

import { RunExtract } from "#/features/run-extract/api/run-extract.ts";
import {
  EMPTY_KEY,
  RunPanelMessage,
  RunPanelModel,
  RunPanelProps,
  RunState,
  requestOf,
} from "#/features/run-extract/model/messages.ts";
import { ApiKeyField } from "#/features/run-extract/ui/api-key-field.ts";
import { ResultTable } from "#/features/run-extract/ui/result-table.ts";
import { COPY } from "#/shared/config/index.ts";

const labelOf = RunState.match({
  Idle: () => COPY.run,
  Running: () => COPY.running,
  Failed: () => COPY.run,
  Done: () => COPY.run,
});

/** @stability experimental */
// oxlint-disable-next-line effecttsgo/missing-pipeable-signature -- Effect UI components are called as (html, options)
export const RunPanelNoDeps = Html.component({
  name: "RunPanel",
  props: RunPanelProps,
  model: RunPanelModel,
  message: RunPanelMessage,
}).make({
  init: () => ({ apiKey: EMPTY_KEY, run: RunState.Idle() }),
  update: {
    ChangedApiKey: (step, { apiKey }) => step.evolve({ apiKey: () => apiKey }),
    ClickedRun: (step) =>
      Option.match(requestOf({ props: step.props, model: step.model }), {
        onNone: () => step.model,
        onSome: (request) =>
          step.evolve({ run: () => RunState.Running() }).run(RunExtract.make(request)),
      }),
    SucceededExtract: (step, { lines }) => step.evolve({ run: () => RunState.Done({ lines }) }),
    FailedExtract: (step, { reason }) => step.evolve({ run: () => RunState.Failed({ reason }) }),
  },
  view: (html, model) => {
    const request = requestOf({ props: html.props, model });
    const outcome: View.Input<typeof RunPanelMessage.Type> = RunState.match(model.run, {
      Idle: () => [],
      Running: () => [],
      Failed: ({ reason }) =>
        html.p
          .attr("role", "alert")
          .class("flex items-start gap-2 text-sm [&_svg]:size-4 [&_svg]:shrink-0")
          .children(Icon({ html, node: CircleX }), reason),
      Done: ({ lines }) => ResultTable({ html, lines }),
    });
    return html.div.class("flex flex-col items-start gap-4").children(
      ApiKeyField({
        html,
        apiKey: model.apiKey,
        onChange: (apiKey) => RunPanelMessage.ChangedApiKey({ apiKey }),
      }),
      Button({
        html,
        props: { disabled: Option.isNone(request) },
        onPress: RunPanelMessage.ClickedRun(),
      }).children(labelOf(model.run)),
      outcome,
    );
  },
});

/** @stability experimental */
// oxlint-disable-next-line effecttsgo/missing-pipeable-signature -- Effect UI components are called as (html, options)
export const RunPanel = RunPanelNoDeps.pipe(Component.provide(RunExtract.live));
