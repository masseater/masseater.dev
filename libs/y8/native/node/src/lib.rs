mod features;
mod shared;

pub use features::check_markdown::{
    FileInput, Flush, LintOptions, flush_telemetry, lint, lint_paths, rules,
};
pub use features::read_files::read_texts;
