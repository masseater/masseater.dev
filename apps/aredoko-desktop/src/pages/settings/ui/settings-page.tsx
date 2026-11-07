import type { ReactNode } from "react";

import { AutostartSetting } from "./autostart-setting.tsx";
import { FolderSetting } from "./folder-setting.tsx";
import { LogSetting } from "./log-setting.tsx";
import { PageHeader } from "./page-header.tsx";
import { VersionInfo } from "./version-info.tsx";

const TITLE = "設定";

const SettingsPage = (): ReactNode => (
  <section className="flex max-w-2xl flex-col gap-4">
    <PageHeader title={TITLE} />
    <FolderSetting />
    <AutostartSetting />
    <LogSetting />
    <VersionInfo />
  </section>
);

export { SettingsPage };
