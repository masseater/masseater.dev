import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { STAFF_ROLE_LABEL } from "#/entities/catalog/lib/part";
import type { PartRow, StaffRole } from "#/entities/catalog/lib/part";

import { PersonLink } from "./person-link";

const PartStaff = ({
  part,
  staffRole,
}: Readonly<{ part: PartRow; staffRole: StaffRole }>): ReactNode => {
  const credits = pipe(
    part.staff,
    Array.filter((credit) => credit.role === staffRole),
  );
  return (
    Array.isReadonlyArrayNonEmpty(credits) && (
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="bg-secondary flex size-5 items-center justify-center rounded-sm text-xs font-bold">
          {STAFF_ROLE_LABEL[staffRole]}
        </span>
        {pipe(
          credits,
          Array.map((credit) => (
            <PersonLink key={credit.person.id} id={credit.person.id} name={credit.person.name} />
          )),
        )}
      </span>
    )
  );
};

export { PartStaff };
