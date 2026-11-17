use std::sync::Arc;

use crate::entities::workflow::{
    Job, Workflow, WorkflowCall as Call, is_self_reference_with_ref, local_path,
    self_reference_error,
};
use crate::features::check_workflow::{Project, Report, Rule};
use crate::shared::text::{quote, sorted_quotes};

pub struct WorkflowCall {
    report: Report,
    path: String,
    project: Option<Arc<Project>>,
}

fn is_local_format(uses: &str) -> bool {
    local_path(uses).is_some_and(|rest| !rest.is_empty() && rest.find('@').is_none_or(|i| i == 0))
}

fn is_repo_format(uses: &str) -> bool {
    if uses.starts_with('.') {
        return false;
    }
    let mut rest = uses;
    for separator in ['/', '/', '@'] {
        match rest.find(separator) {
            Some(index) if index > 0 => rest = &rest[index + 1..],
            _ => return false,
        }
    }
    !rest.is_empty()
}

fn note(kind: &str, names: &[&str]) -> String {
    match names {
        [] => format!("no {kind} is defined"),
        [one] => format!("defined {kind} is {}", quote(one)),
        many => format!("defined {kind}s are {}", sorted_quotes(many)),
    }
}

impl WorkflowCall {
    pub fn new(path: String, project: Option<Arc<Project>>) -> Self {
        Self {
            report: Report::default(),
            path,
            project,
        }
    }

    fn check_local(&mut self, project: &Project, call: &Call) {
        let Some(uses) = &call.uses else {
            return;
        };
        let metadata = match project.workflows.find(&project.root, &uses.value) {
            Err(message) => {
                self.error(uses.pos, message);
                return;
            }
            Ok(None) => return,
            Ok(Some(metadata)) => metadata,
        };
        let spec = quote(&uses.value);
        for (id, input) in &metadata.inputs {
            if input.required && !call.inputs.contains_key(id) {
                self.error(
                    uses.pos,
                    format!(
                        "input {} is required by {spec} reusable workflow",
                        quote(&input.name)
                    ),
                );
            }
        }
        let input_names: Vec<&str> = metadata.inputs.values().map(|i| i.name.as_str()).collect();
        for (id, value) in &call.inputs {
            if !metadata.inputs.contains_key(id) {
                self.error(
                    value.name.pos,
                    format!(
                        "input {} is not defined in {spec} reusable workflow. {}",
                        quote(&value.name.value),
                        note("input", &input_names)
                    ),
                );
            }
        }
        if call.inherit_secrets {
            return;
        }
        for (id, secret) in &metadata.secrets {
            if secret.required && !call.secrets.contains_key(id) {
                self.error(
                    uses.pos,
                    format!(
                        "secret {} is required by {spec} reusable workflow",
                        quote(&secret.name)
                    ),
                );
            }
        }
        let secret_names: Vec<&str> = metadata.secrets.values().map(|s| s.name.as_str()).collect();
        for (id, value) in &call.secrets {
            if !metadata.secrets.contains_key(id) {
                self.error(
                    value.name.pos,
                    format!(
                        "secret {} is not defined in {spec} reusable workflow. {}",
                        quote(&value.name.value),
                        note("secret", &secret_names)
                    ),
                );
            }
        }
    }
}

impl Rule for WorkflowCall {
    fn name(&self) -> &'static str {
        "workflow-call"
    }

    fn report(&mut self) -> &mut Report {
        &mut self.report
    }

    fn visit_workflow_pre(&mut self, workflow: &Workflow) {
        if let (Some(project), Some(event)) = (&self.project, workflow.workflow_call_event()) {
            project
                .workflows
                .remember_event(&project.root, &self.path, event);
        }
    }

    fn visit_job_pre(&mut self, job: &Job) {
        let Some(call) = &job.workflow_call else {
            return;
        };
        let Some(uses) = &call.uses else {
            return;
        };
        if uses.value.is_empty() || uses.contains_expression() {
            return;
        }
        if is_local_format(&uses.value) {
            if let Some(project) = self.project.clone() {
                self.check_local(&project, call);
            }
            return;
        }
        if is_repo_format(&uses.value) {
            return;
        }
        if is_self_reference_with_ref(&uses.value) {
            self.error(uses.pos, self_reference_error(&uses.value));
            return;
        }
        if let Some(project) = &self.project
            && uses.value.starts_with("./")
        {
            project.workflows.store(&uses.value, None);
        }
        self.error(
            uses.pos,
            format!(
                "reusable workflow call {} at \"uses\" is not following the format \"owner/repo/path/to/workflow.yml@ref\" nor \"./path/to/workflow.yml\". see https://docs.github.com/en/actions/learn-github-actions/reusing-workflows for more details",
                quote(&uses.value)
            ),
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_uses_formats() {
        assert!(is_local_format("./a.yml"));
        assert!(!is_local_format("./a.yml@v1"));
        assert!(is_repo_format("o/r/.github/workflows/a.yml@v1"));
        assert!(!is_repo_format("o/r@v1"));
        assert_eq!(
            note("input", &["b", "a"]),
            "defined inputs are \"a\", \"b\""
        );
    }
}
