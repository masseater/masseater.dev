mod features;
mod shared;

pub use features::check_markdown::{
    FileInput, Flush, LintOptions, flush_telemetry, lint, lint_paths, rules,
};
