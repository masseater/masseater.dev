import type { ReactNode } from "react";

import type { ProfileSectionValue } from "#/entities/watashi";
import { Card } from "#/shared/ui";

import { DocumentBar } from "./document-bar";
import { SectionList } from "./section-list";

export const ProfileDocument = ({
  sections,
}: Readonly<{ sections: readonly ProfileSectionValue[] }>): ReactNode => (
  <Card>
    <DocumentBar sections={sections} />
    <SectionList sections={sections} />
  </Card>
);
