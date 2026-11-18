import { Array as Arr, Option, Order, Record as Rec, pipe } from "effect";

export type Props = Readonly<Record<string, ExprType>>;

export interface ObjectType {
  readonly kind: "object";
  readonly props: Props;
  readonly mapped: Option.Option<ExprType>;
}

export interface ArrayType {
  readonly kind: "array";
  readonly elem: ExprType;
  readonly deref: boolean;
}

export type ExprType =
  | { readonly kind: "any" }
  | { readonly kind: "null" }
  | { readonly kind: "number" }
  | { readonly kind: "bool" }
  | { readonly kind: "string" }
  | ObjectType
  | ArrayType;

type Describe = (type: ExprType) => string;

export const ANY: ExprType = { kind: "any" };
export const NULL: ExprType = { kind: "null" };
export const NUMBER: ExprType = { kind: "number" };
export const BOOL: ExprType = { kind: "bool" };
export const STRING: ExprType = { kind: "string" };

const EMPTY: Props = Rec.empty();

export const objectOf =
  (props: Props) =>
  (mapped: Option.Option<ExprType>): ObjectType => ({ kind: "object", props, mapped });

export const strict = (props: Props = EMPTY): ObjectType => objectOf(props)(Option.none());
export const loose = (props: Props = EMPTY): ObjectType => objectOf(props)(Option.some(ANY));
export const mapOf = (elem: ExprType): ObjectType => objectOf(EMPTY)(Option.some(elem));
export const arrayOf = (elem: ExprType): ArrayType => ({ kind: "array", elem, deref: false });
export const filteredOf = (elem: ExprType): ArrayType => ({ kind: "array", elem, deref: true });

export const isStrict = (object: ObjectType): boolean => Option.isNone(object.mapped);
export const isLoose = (object: ObjectType): boolean =>
  Option.exists(object.mapped, (mapped) => mapped.kind === "any");

export const sortedNames = (props: Props): readonly string[] =>
  Arr.sort(Rec.keys(props), Order.String);

const describeObject =
  (recurse: Describe) =>
  (object: ObjectType): string =>
    Option.match(object.mapped, {
      onNone: () =>
        `{${pipe(
          sortedNames(object.props),
          Arr.map((name) => `${name}: ${recurse(object.props[name] ?? ANY)}`),
          Arr.join("; "),
        )}}`,
      onSome: (mapped) => {
        if (mapped.kind === "any") {
          return "object";
        }
        return `{string => ${recurse(mapped)}}`;
      },
    });

export const describe: Describe = (type) => {
  if (type.kind === "object") {
    return describeObject(describe)(type);
  }
  if (type.kind === "array") {
    return `array<${describe(type.elem)}>`;
  }
  return type.kind;
};
