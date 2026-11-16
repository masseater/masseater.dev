import { Option } from "effect";

const SLACK = 1.5;
const NEAR = 3;

export interface Scroller {
  readonly node: HTMLElement;
  readonly moveTo: (left: number) => void;
  readonly settle: () => boolean;
}

export const createScroller = (node: HTMLElement): Scroller => {
  let expected = Option.none<number>();
  return {
    node,
    moveTo: (left) => {
      if (Math.abs(node.scrollLeft - left) > SLACK) {
        expected = Option.some(left);
        node.scrollLeft = left;
      }
    },
    settle: () => {
      const own = Option.exists(expected, (left) => Math.abs(node.scrollLeft - left) < NEAR);
      if (own) {
        expected = Option.none();
      }
      return own;
    },
  };
};
