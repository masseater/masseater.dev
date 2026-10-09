import type { ReactNode } from "react";

import { ProfileHeader } from "./profile-header";
import { ProjectSection } from "./project-section";

const HomePage = (): ReactNode => (
  <main className="mx-auto flex max-w-2xl flex-col gap-12 px-4 py-16">
    <ProfileHeader />
    <ProjectSection />
  </main>
);

export { HomePage };
