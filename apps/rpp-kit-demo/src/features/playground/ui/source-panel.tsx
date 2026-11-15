import { useCallback } from "react";
import type { ReactNode } from "react";

import { useSourceTab } from "#/features/playground/model/tabs";
import { playground } from "#/shared/config";

import { Pane } from "./pane";
import { Panel } from "./panel";
import { PanelBody } from "./panel-body";
import { TabButton } from "./tab-button";

export const SourcePanel = (): ReactNode => {
  const [tab, setTab] = useSourceTab();
  const showMain = useCallback(() => {
    setTab("main");
  }, [setTab]);
  const showRpp = useCallback(() => {
    setTab("rpp");
  }, [setTab]);
  return (
    <Panel className="h-96 lg:h-auto">
      <div className="border-border flex border-b px-1" role="tablist">
        <TabButton label={playground.panes.main} active={tab === "main"} onSelect={showMain} />
        <TabButton label={playground.panes.rpp} active={tab === "rpp"} onSelect={showRpp} />
      </div>
      <PanelBody>
        <Pane name="main" active={tab === "main"} />
        <Pane name="rpp" active={tab === "rpp"} />
      </PanelBody>
    </Panel>
  );
};
