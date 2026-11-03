import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const CategoryItem = ({ tag }: Readonly<{ tag: string }>): ReactNode => (
  <li className="border-wiki-divider border-s px-2 first:border-s-0 first:ps-0">
    <Link className="text-wiki-link hover:underline" hash={tag} to="/sloppedia/categories">
      {tag}
    </Link>
  </li>
);

export { CategoryItem };
