import { Array as Arr, Option, String as Str, pipe } from "effect";
import { Parser } from "liquidjs";
import type { Liquid, TagToken, Template } from "liquidjs";

type Registered =
  Parameters<Liquid["registerTag"]> extends readonly [string, infer Tag] ? Tag : never;
type TagOptions = Exclude<Registered, new (...args: never) => unknown>;

const ENTERPRISE = new Set(["ghes", "ghae"]);
const NEGATION = "not";

interface Branch {
  readonly enabled: boolean;
  readonly templates: Template[];
}

const atomEnabled = (atom: string): boolean => {
  const [head, ...rest] = Str.split(Str.trim(atom), " ");
  if (head === NEGATION) {
    return !atomEnabled(Arr.join(rest, " "));
  }
  return !ENTERPRISE.has(head);
};

export const onDotcom = (expression: string): boolean =>
  pipe(
    Str.split(expression, " or "),
    Arr.some((alternative) => pipe(Str.split(alternative, " and "), Arr.every(atomEnabled))),
  );

const branchesOf = new WeakMap<object, Branch[]>();

export const IF_VERSION = {
  parse(token, remaining): void {
    const branches: Branch[] = [];
    branchesOf.set(this, branches);
    const open = (enabled: boolean): void => {
      branches.push({ enabled, templates: [] });
    };
    open(onDotcom(token.args));
    const stream = new Parser(this.liquid).parseStream(remaining);
    stream
      .on("tag:elsif", (next: TagToken) => {
        open(onDotcom(next.args));
      })
      .on("tag:else", () => {
        open(true);
      })
      .on("tag:endif", () => {
        stream.stop();
      })
      .on("template", (template: Template) => {
        pipe(
          Arr.last(branches),
          Option.map((branch) => branch.templates.push(template)),
        );
      })
      .start();
  },
  *render(context, emitter): Generator<unknown, void, unknown> {
    const taken = pipe(
      Option.fromNullishOr(branchesOf.get(this)),
      Option.flatMap(Arr.findFirst((branch) => branch.enabled)),
    );
    if (Option.isSome(taken)) {
      yield this.liquid.renderer.renderTemplates(taken.value.templates, context, emitter);
    }
  },
} satisfies TagOptions;
