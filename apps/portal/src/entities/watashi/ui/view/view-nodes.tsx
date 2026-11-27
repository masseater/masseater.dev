import type { ViewNode } from "@masseater.dev/watashi-protocol";
import { Array as Arr, Match, Option, pipe } from "effect";
import { Fragment } from "react";
import type { ReactNode } from "react";

import { FoldView } from "./fold-view.tsx";
import { HeadlineView } from "./headline-view.tsx";
import { LinksView } from "./links-view.tsx";
import { ListView } from "./list-view.tsx";
import { PointView } from "./point-view.tsx";
import { SectionView } from "./section-view.tsx";
import { TextView } from "./text-view.tsx";

type Nested = (props: Readonly<{ nodes: readonly ViewNode[] }>) => ReactNode;

type Rendered = (Nested: Nested) => ReactNode;

const renderNode: (node: ViewNode) => Rendered = Match.type<ViewNode>().pipe(
  Match.discriminatorsExhaustive("type")({
    Headline:
      (node): Rendered =>
      () => <HeadlineView text={node.text} />,
    Point:
      (node): Rendered =>
      (Nested) => (
        <PointView
          days={node.days ?? ""}
          detail={pipe(
            Option.fromUndefinedOr(node.detail),
            Option.map((nodes) => <Nested key="detail" nodes={nodes} />),
            Option.getOrNull,
          )}
          text={node.text}
          theme={node.theme}
        />
      ),
    Fold:
      (node): Rendered =>
      (Nested) => (
        <FoldView label={node.label}>
          <Nested nodes={node.children} />
        </FoldView>
      ),
    Section:
      (node): Rendered =>
      (Nested) => (
        <SectionView title={node.title}>
          <Nested nodes={node.children} />
        </SectionView>
      ),
    Text:
      (node): Rendered =>
      () => <TextView text={node.text} />,
    List:
      (node): Rendered =>
      () => <ListView items={node.items} />,
    Links:
      (node): Rendered =>
      () => <LinksView items={node.items} />,
  }),
);

const keyOf = (node: ViewNode, index: number): string => `${node.type}-${String(index)}`;

export const ViewNodes = ({ nodes }: Readonly<{ nodes: readonly ViewNode[] }>): ReactNode =>
  pipe(
    nodes,
    Arr.map((node, index) => (
      <Fragment key={keyOf(node, index)}>{renderNode(node)(ViewNodes)}</Fragment>
    )),
  );
