use crate::entities::workflow::{Event, EventFilter, Job, Text, Workflow};
use crate::features::check_workflow::{Report, Rule};
use crate::shared::glob::{InvalidGlob, validate_path, validate_ref};
use crate::shared::yaml::Pos;

#[derive(Default)]
pub struct Glob {
    report: Report,
}

impl Glob {
    fn report_errors(&mut self, errors: Vec<InvalidGlob>, pos: Pos, quoted: bool) {
        for error in errors {
            let mut at = pos;
            if quoted {
                at.col += 1;
            }
            if error.column != 0 {
                at.col += error.column - 1;
            }
            self.error(
                at,
                format!(
                    "{}. note: filter pattern syntax is explained at https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#filter-pattern-cheat-sheet",
                    error.message
                ),
            );
        }
    }

    fn check_ref(&mut self, text: &Text) {
        if text.value.is_empty() {
            return;
        }
        self.report_errors(validate_ref(&text.value), text.pos, text.quoted);
    }

    fn check_refs(&mut self, filter: Option<&EventFilter>) {
        for value in filter.iter().flat_map(|f| &f.values) {
            self.check_ref(value);
        }
    }

    fn check_paths(&mut self, filter: Option<&EventFilter>) {
        for value in filter.iter().flat_map(|f| &f.values) {
            if !value.value.is_empty() {
                self.report_errors(validate_path(&value.value), value.pos, value.quoted);
            }
        }
    }
}

impl Rule for Glob {
    fn name(&self) -> &'static str {
        "glob"
    }

    fn report(&mut self) -> &mut Report {
        &mut self.report
    }

    fn visit_workflow_pre(&mut self, workflow: &Workflow) {
        for event in workflow.on.iter().flatten() {
            match event {
                Event::Webhook(hook) => {
                    self.check_refs(hook.branches.as_ref());
                    self.check_refs(hook.branches_ignore.as_ref());
                    self.check_refs(hook.tags.as_ref());
                    self.check_refs(hook.tags_ignore.as_ref());
                    self.check_paths(hook.paths.as_ref());
                    self.check_paths(hook.paths_ignore.as_ref());
                }
                Event::ImageVersion { versions, .. } => {
                    for version in versions {
                        self.check_ref(version);
                    }
                }
                _ => {}
            }
        }
    }

    fn visit_job_pre(&mut self, job: &Job) {
        if let Some(version) = job.snapshot.as_ref().and_then(|s| s.version.as_ref()) {
            self.check_ref(version);
        }
    }
}
