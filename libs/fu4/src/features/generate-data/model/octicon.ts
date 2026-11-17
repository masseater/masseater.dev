import { Option, Predicate, pipe } from "effect";
import { Hash, Tag } from "liquidjs";
import type { Context, Emitter, Tokenizer } from "liquidjs";

const LABEL = "aria-label";

const afterIcon = (tokenizer: Tokenizer): Tokenizer => {
  tokenizer.readValue();
  return tokenizer;
};

export class Octicon extends Tag {
  private readonly hash = new Hash(afterIcon(this.tokenizer));

  public *render(context: Context, emitter: Emitter): Generator<unknown, void, unknown> {
    const values: unknown = yield this.hash.render(context);
    const label = pipe(
      Option.liftPredicate(values, Predicate.hasProperty(LABEL)),
      Option.map((found) => found[LABEL]),
      Option.filter(Predicate.isString),
      Option.getOrElse(() => ""),
    );
    emitter.write(label);
  }
}
