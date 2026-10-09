import type { ReactNode } from "react";

const ProfileLink = ({ label, href }: Readonly<{ label: string; href: string }>): ReactNode => (
  <li>
    <a className="text-primary underline underline-offset-4" href={href}>
      {label}
    </a>
  </li>
);

export { ProfileLink };
