import { Array as Arr, Option, String as Str, pipe } from "effect";
import { Tag } from "liquidjs";
import type { Context, Emitter, Liquid, Parser, TagToken, Template, TopLevelToken } from "liquidjs";

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

export class IfVersion extends Tag {
  private readonly branches: Branch[] = [];

  public constructor(
    ...[token, remain, liquid, parser]: readonly [TagToken, TopLevelToken[], Liquid, Parser]
  ) {
    super(token, remain, liquid);
    this.open(onDotcom(token.args));
    const stream = parser.parseStream(remain);
    stream
      .on("tag:elsif", (next: TagToken) => {
        this.open(onDotcom(next.args));
      })
      .on("tag:else", () => {
        this.open(true);
      })
      .on("tag:endif", () => {
        stream.stop();
      })
      .on("template", (template: Template) => {
        pipe(
          Arr.last(this.branches),
          Option.map((branch) => branch.templates.push(template)),
        );
      })
      .start();
  }

  public *render(context: Context, emitter: Emitter): Generator<unknown, void, unknown> {
    const taken = Arr.findFirst(this.branches, (branch) => branch.enabled);
    if (Option.isSome(taken)) {
      yield this.liquid.renderer.renderTemplates(taken.value.templates, context, emitter);
    }
  }

  private open(enabled: boolean): void {
    this.branches.push({ enabled, templates: [] });
  }
}
