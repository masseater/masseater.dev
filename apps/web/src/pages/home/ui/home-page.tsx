import type { ReactNode } from "react";

import { ProfileHeader } from "./profile-header";

const HomePage = (): ReactNode => (
  <main className="grid min-h-dvh place-items-center px-4">
    <ProfileHeader />
  </main>
);

export { HomePage };
