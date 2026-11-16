pub mod autolink;
pub mod blocks;
pub mod common;
pub mod headings;
pub mod inline;
pub mod links;
pub mod lists;
pub mod names;
pub mod quotes;
pub mod tables;
pub mod whitespace;

use crate::rule::Rule;

#[must_use]
pub fn builtin() -> Vec<&'static dyn Rule> {
    vec![
        &headings::Md001,
        &headings::Md003,
        &lists::Md004,
        &lists::Md005,
        &lists::Md007,
        &whitespace::Md009,
        &whitespace::Md010,
        &whitespace::Md011,
        &whitespace::Md012,
        &whitespace::Md013,
        &headings::Md018,
        &headings::Md019,
        &headings::Md020,
        &headings::Md021,
        &headings::Md022,
        &headings::Md023,
        &headings::Md024,
        &headings::Md025,
        &headings::Md026,
        &quotes::Md027,
        &quotes::Md028,
        &lists::Md029,
        &lists::Md030,
        &lists::Md032,
        &inline::Md033,
        &inline::Md034,
        &inline::Md035,
        &inline::Md036,
        &inline::Md037,
        &inline::Md038,
        &inline::Md039,
        &inline::Md042,
        &inline::Md045,
        &inline::Md049,
        &inline::Md050,
        &blocks::Md014,
        &blocks::Md031,
        &blocks::Md040,
        &blocks::Md046,
        &blocks::Md048,
        &headings::Md041,
        &headings::Md043,
        &names::Md044,
        &whitespace::Md047,
        &links::Md051,
        &links::Md052,
        &links::Md053,
        &links::Md054,
        &tables::Md055,
        &tables::Md056,
        &tables::Md058,
        &links::Md059,
        &tables::Md060,
    ]
}
