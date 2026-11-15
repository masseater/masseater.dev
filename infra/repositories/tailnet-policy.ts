import { Array as Arr, Equal, Option, Record, Schema, pipe } from "effect";
import { applyEdits, modify, parse } from "jsonc-parser";
import type { FormattingOptions } from "jsonc-parser";

export type Grant = Readonly<{
  src: readonly string[];
  dst: readonly string[];
  ip: readonly string[];
}>;

export type PolicyEntries = Readonly<{
  tagOwners: Readonly<Record<string, readonly string[]>>;
  grants: readonly Grant[];
}>;

const ParsedPolicy = Schema.Struct({
  tagOwners: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  grants: Schema.optional(Schema.Array(Schema.Unknown)),
});

type Edit = Readonly<{ path: readonly (string | number)[]; value?: unknown; insert?: boolean }>;

const FORMATTING: FormattingOptions = { insertSpaces: true, tabSize: 2, eol: "\n" };

const PARSE_OPTIONS = { allowTrailingComma: true, disallowComments: false };

const decodePolicy = Schema.decodeUnknownOption(ParsedPolicy);

const parsed = (body: string): typeof ParsedPolicy.Type =>
  Option.getOrElse(decodePolicy(parse(body, [], PARSE_OPTIONS)), () => ({}));

const tagOwnerOf = (body: string, tag: string): Option.Option<unknown> =>
  pipe(
    Option.fromNullishOr(parsed(body).tagOwners),
    Option.flatMap((owners) => Record.get(owners, tag)),
  );

const grantsOf = (body: string): Option.Option<readonly unknown[]> =>
  Option.fromNullishOr(parsed(body).grants);

const edited =
  ({ path, value, insert = false }: Edit) =>
  (body: string): string =>
    applyEdits(
      body,
      modify(body, [...path], value, { formattingOptions: FORMATTING, isArrayInsertion: insert }),
    );

const withTagOwners =
  (entries: PolicyEntries) =>
  (body: string): string =>
    Arr.reduce(Record.toEntries(entries.tagOwners), body, (current, [tag, owners]) => {
      if (Option.exists(tagOwnerOf(current, tag), (present) => Equal.equals(present, owners))) {
        return current;
      }
      return edited({ path: ["tagOwners", tag], value: owners })(current);
    });

const withGrant =
  (grant: Grant) =>
  (current: string): string =>
    Option.match(grantsOf(current), {
      onNone: () => edited({ path: ["grants"], value: [grant] })(current),
      onSome: (existing) => {
        if (
          pipe(
            existing,
            Arr.some((present) => Equal.equals(present, grant)),
          )
        ) {
          return current;
        }
        return edited({ path: ["grants", existing.length], value: grant, insert: true })(current);
      },
    });

const withGrants =
  (entries: PolicyEntries) =>
  (body: string): string =>
    Arr.reduce(entries.grants, body, (current, grant) => withGrant(grant)(current));

export const ensureEntries =
  (entries: PolicyEntries) =>
  (body: string): string =>
    pipe(body, withTagOwners(entries), withGrants(entries));

const withoutGrant =
  (grant: Grant) =>
  (current: string): string =>
    pipe(
      grantsOf(current),
      Option.flatMap(Arr.findFirstIndex((present) => Equal.equals(present, grant))),
      Option.match({
        onNone: () => current,
        onSome: (index) => edited({ path: ["grants", index] })(current),
      }),
    );

const withoutGrants =
  (entries: PolicyEntries) =>
  (body: string): string =>
    Arr.reduce(entries.grants, body, (current, grant) => withoutGrant(grant)(current));

const withoutTagOwners =
  (entries: PolicyEntries) =>
  (body: string): string =>
    Arr.reduce(Record.keys(entries.tagOwners), body, (current, tag) => {
      if (Option.isNone(tagOwnerOf(current, tag))) {
        return current;
      }
      return edited({ path: ["tagOwners", tag] })(current);
    });

export const removeEntries =
  (entries: PolicyEntries) =>
  (body: string): string =>
    pipe(body, withoutGrants(entries), withoutTagOwners(entries));
