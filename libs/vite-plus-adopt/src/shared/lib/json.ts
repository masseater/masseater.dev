import { Option, Schema } from "effect";

const JsonText = Schema.fromJsonString(Schema.Unknown);

const encodeJson = Schema.encodeUnknownOption(JsonText);

export const toJson = (value: unknown): string =>
  Option.getOrElse(encodeJson(value), () => String(value));

export const parseJson: (text: string) => Option.Option<unknown> = Schema.decodeOption(JsonText);
