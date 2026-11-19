import { Array as Arr, Match, Result, String as Str, pipe } from "effect";

export type Packet =
  | { readonly type: "data"; readonly data: string }
  | { readonly type: "flush" }
  | { readonly type: "delim" };

const PREFIX = 4;
const HEX = 16;
const FLUSH = 0;
const DELIM = 1;
const SMALLEST_DATA = 5;
const START = 0;
const ERROR = "ERR ";
const LENGTH = /^[0-9a-f]{4}$/iu;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const hexLength = (length: number): string => Str.padStart(PREFIX, "0")(length.toString(HEX));

const encodeOne: (packet: Packet) => string = Match.type<Packet>().pipe(
  Match.discriminatorsExhaustive("type")({
    data: ({ data }) => `${hexLength(encoder.encode(data).length + PREFIX)}${data}`,
    flush: () => "0000",
    delim: () => "0001",
  }),
);

export const encodePackets = (packets: readonly Packet[]): Uint8Array =>
  encoder.encode(pipe(packets, Arr.map(encodeOne), Arr.join("")));

export type Step = readonly [Packet, number];

const lengthAt =
  (bytes: Uint8Array) =>
  (position: number): Result.Result<number, string> => {
    const text = decoder.decode(bytes.subarray(position, position + PREFIX));
    if (!LENGTH.test(text)) {
      return Result.fail(`invalid packet line length: ${text}`);
    }
    return Result.succeed(Number.parseInt(text, HEX));
  };

const dataAt =
  (bytes: Uint8Array, position: number) =>
  (length: number): Result.Result<Step, string> => {
    const end = position + length;
    if (end > bytes.length) {
      return Result.fail(`packet line data is too short: expected ${length} bytes`);
    }
    const data = decoder.decode(bytes.subarray(position + PREFIX, end));
    if (Str.startsWith(ERROR)(data)) {
      return Result.fail(`in-band error: ${Str.slice(ERROR.length)(data)}`);
    }
    return Result.succeed([{ type: "data", data }, end]);
  };

export const packetAt =
  (bytes: Uint8Array) =>
  (position: number): Result.Result<Step, string> =>
    Result.flatMap(lengthAt(bytes)(position), (length) => {
      if (length === FLUSH) {
        return Result.succeed([{ type: "flush" }, position + PREFIX]);
      }
      if (length === DELIM) {
        return Result.succeed([{ type: "delim" }, position + PREFIX]);
      }
      if (length < SMALLEST_DATA) {
        return Result.fail(`invalid packet line: unexpected control code ${length}`);
      }
      return dataAt(bytes, position)(length);
    });

export const decodePackets = (bytes: Uint8Array): Result.Result<readonly Packet[], string> => {
  const packets: Packet[] = [];
  let position = START;
  while (position < bytes.length) {
    const next = packetAt(bytes)(position);
    if (Result.isFailure(next)) {
      return Result.fail(next.failure);
    }
    const [packet, after] = next.success;
    packets.push(packet);
    position = after;
  }
  return Result.succeed(packets);
};
