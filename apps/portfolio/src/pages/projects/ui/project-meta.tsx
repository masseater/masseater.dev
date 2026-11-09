import { Link } from "@tanstack/react-router";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Project } from "#/pages/projects/model/projects";
import { TagList } from "#/shared/ui";

const LINK_CLASS = "hover:text-foreground transition-colors";

const BLOG_LABEL = "Blog";

const ProjectMeta = ({ project }: Readonly<{ project: Project }>): ReactNode => (
  <div className="font-display text-foreground/50 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs tracking-widest uppercase">
    <TagList tags={project.tags} />
    {pipe(
      project.blogs,
      Arr.map((blog) => (
        <Link className={LINK_CLASS} key={blog.slug} params={blog} to="/$category/$slug">
          {BLOG_LABEL}
        </Link>
      )),
    )}
    {pipe(
      project.links,
      Arr.map((link) => (
        <a className={LINK_CLASS} href={link.href} key={link.href}>
          {link.label}
        </a>
      )),
    )}
  </div>
);

export { ProjectMeta };
