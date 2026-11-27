import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";

import { FIRST, indexIn, timeOf } from "./als-xml.test.support.ts";

export interface GainPoint {
  readonly beat: number;
  readonly gain: number;
}

export interface MixSpec {
  readonly volume: number;
  readonly pan: number;
  readonly send: number;
  readonly automation: readonly GainPoint[];
}

const withManual = (xml: string, element: string, value: number): string => {
  const start = indexIn({ text: xml, search: element, from: FIRST });
  const at = indexIn({ text: xml, search: "<Manual Value=", from: start });
  const end = indexIn({ text: xml, search: "/>", from: at });
  return `${pipe(xml, Str.slice(FIRST, at))}<Manual Value="${String(value)}" ${pipe(xml, Str.slice(end))}`;
};

const TARGET_ID = /<AutomationTarget Id="(?<id>\d+)">/u;

const floatEvent = (point: GainPoint, event: number): string => {
  const time = timeOf({ beat: point.beat, id: event });
  return `<FloatEvent Id="${String(event)}" Time="${String(time)}" Value="${String(point.gain)}" />`;
};

const withAutomation = (xml: string, points: readonly GainPoint[]): string => {
  const volume = indexIn({ text: xml, search: "<Volume>", from: FIRST });
  const id = pipe(
    xml,
    Str.slice(volume),
    Str.match(TARGET_ID),
    Option.flatMap((match) => Option.fromUndefinedOr(match.groups)),
    Option.flatMap(Rec.get("id")),
    Option.getOrThrowWith(() => new Error("The template has no volume target")),
  );
  const events = pipe(points, Arr.map(floatEvent), Arr.join(""));
  const envelope = `<Envelopes><AutomationEnvelope Id="0"><EnvelopeTarget><PointeeId Value="${id}" /></EnvelopeTarget><Automation><Events>${events}</Events><AutomationTransformViewState><IsTransformPending Value="false" /><TimeAndValueTransforms /></AutomationTransformViewState></Automation></AutomationEnvelope></Envelopes>`;
  return pipe(xml, Str.replace("<Envelopes />", envelope));
};

const mixed =
  (xml: string) =>
  (given: MixSpec): string => {
    const loud = withManual(xml, "<Volume>", given.volume);
    const panned = withManual(loud, "<Pan>", given.pan);
    const sent = withManual(panned, "<Send>", given.send);
    return withAutomation(sent, given.automation);
  };

export type Mixing = Readonly<{ xml: string; mix: Option.Option<MixSpec> }>;

export const withMix = ({ xml, mix }: Mixing): string =>
  Option.match(mix, { onNone: () => xml, onSome: mixed(xml) });
