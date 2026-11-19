import { useCallback, useId } from "react";
import type { ReactNode } from "react";

import { useSourceTab, useTabKeys } from "#/features/run-playground/model/tabs.ts";
import { playground } from "#/shared/config/index.ts";

import { PanelBody } from "./panel-body.tsx";
import { Panel } from "./panel.tsx";
import { TabButton } from "./tab-button.tsx";
import { TabPane } from "./tab-pane.tsx";

export const SourcePanel = (): ReactNode => {
  const [tab, setTab] = useSourceTab();
  const move = useTabKeys();
  const id = useId();
  const mainTab = `${id}-main`;
  const rppTab = `${id}-rpp`;
  const showMain = useCallback(() => {
    setTab("main");
  }, [setTab]);
  const showRpp = useCallback(() => {
    setTab("rpp");
  }, [setTab]);
  return (
    <Panel className="h-96 lg:h-auto">
      <div className="border-border flex border-b px-1" role="tablist">
        <TabButton
          active={tab === "main"}
          id={mainTab}
          label={playground.panes.main}
          name="main"
          onKeyDown={move}
          onSelect={showMain}
        />
        <TabButton
          active={tab === "rpp"}
          id={rppTab}
          label={playground.panes.rpp}
          name="rpp"
          onKeyDown={move}
          onSelect={showRpp}
        />
      </div>
      <PanelBody>
        <TabPane active={tab === "main"} name="main" tab={mainTab} />
        <TabPane active={tab === "rpp"} name="rpp" tab={rppTab} />
      </PanelBody>
    </Panel>
  );
};
