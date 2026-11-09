import { Link } from "@tanstack/react-router";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Project } from "#/pages/projects/model/projects";

const SUB_LINK =
  "font-display text-foreground/50 hover:text-foreground text-xs tracking-widest uppercase transition-colors";

const BLOG_LABEL = "Blog";

const ProjectItem = ({ project }: Readonly<{ project: Project }>): ReactNode => (
  <li className="border-foreground/10 flex flex-col gap-1 border-t py-5 sm:flex-row sm:items-baseline sm:gap-8">
    <a
      className="font-display hover:text-foreground/70 shrink-0 self-start text-xl font-light transition-colors sm:w-64"
      href={project.href}
    >
      {project.name}
    </a>
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1">
      <p className="text-foreground/70 text-sm">{project.description}</p>
      {pipe(
        project.blogs,
        Arr.map((blog) => (
          <Link className={SUB_LINK} key={blog.slug} params={blog} to="/$category/$slug">
            {BLOG_LABEL}
          </Link>
        )),
      )}
      {pipe(
        project.links,
        Arr.map((link) => (
          <a className={SUB_LINK} href={link.href} key={link.href}>
            {link.label}
          </a>
        )),
      )}
    </div>
  </li>
);

export { ProjectItem };
