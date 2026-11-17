use std::collections::HashMap;
use std::sync::LazyLock;

use regex::Regex;

use crate::entities::workflow::{Job, Step, Text};
use crate::features::check_workflow::{Report, Rule};
use crate::shared::text::quote;
use crate::shared::yaml::Pos;

static ID_PATTERN: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^[a-zA-Z_][a-zA-Z0-9_-]*$").expect("id pattern"));

#[derive(Default)]
pub struct Id {
    report: Report,
    seen: HashMap<String, Pos>,
}

impl Id {
    fn validate(&mut self, id: &Text, what: &str) {
        if id.value.is_empty() || id.contains_expression() || ID_PATTERN.is_match(&id.value) {
            return;
        }
        self.error(
            id.pos,
            format!(
                "invalid {what} ID {}. {what} ID must start with a letter or _ and contain only alphanumeric characters, -, or _",
                quote(&id.value)
            ),
        );
    }
}

impl Rule for Id {
    fn name(&self) -> &'static str {
        "id"
    }

    fn report(&mut self) -> &mut Report {
        &mut self.report
    }

    fn visit_job_pre(&mut self, job: &Job) {
        self.seen.clear();
        self.validate(&job.id, "job");
        for need in &job.needs {
            self.validate(need, "job");
        }
    }

    fn visit_job_post(&mut self, _job: &Job) {
        self.seen.clear();
    }

    fn visit_step(&mut self, step: &Step) {
        let Some(id) = &step.id else {
            return;
        };
        self.validate(id, "step");
        let key = id.value.to_lowercase();
        if let Some(previous) = self.seen.get(&key) {
            let message = format!(
                "step ID {} duplicates. previously defined at {}. step ID must be unique within a job. note that step ID is case insensitive",
                quote(&id.value),
                previous.describe()
            );
            self.error(id.pos, message);
            return;
        }
        self.seen.insert(key, id.pos);
    }
}
