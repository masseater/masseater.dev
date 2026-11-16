import type { ReactNode } from "react";

import type { ProfileSectionValue } from "#/entities/watashi/index.ts";
import { Card } from "#/shared/ui/index.ts";

import { DocumentBar } from "./document-bar.tsx";
import { SectionList } from "./section-list.tsx";

export const ProfileDocument = ({
  sections,
}: Readonly<{ sections: readonly ProfileSectionValue[] }>): ReactNode => (
  <Card>
    <DocumentBar sections={sections} />
    <SectionList sections={sections} />
  </Card>
);
