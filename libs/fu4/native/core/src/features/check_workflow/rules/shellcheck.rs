use crate::entities::workflow::{Defaults, Exec, Job, Step, Workflow};
use crate::features::check_workflow::{Report, Rule};
use crate::shared::shell::check;

fn default_shell(defaults: Option<&Defaults>) -> Option<String> {
    defaults
        .and_then(|defaults| defaults.run.as_ref())
        .and_then(|run| run.shell.as_ref())
        .map(|shell| shell.value.clone())
}

fn sanitize(source: &str) -> String {
    let mut out = String::with_capacity(source.len());
    let mut rest = source;
    while let Some(start) = rest.find("${{")
        && let Some(length) = rest[start..].find("}}")
    {
        let end = start + length + 2;
        out.push_str(&rest[..start]);
        out.extend(std::iter::repeat_n('_', end - start));
        rest = &rest[end..];
    }
    out.push_str(rest);
    out
}

fn is_checked(shell: &str) -> bool {
    matches!(shell, "bash" | "sh") || shell.starts_with("bash ") || shell.starts_with("sh ")
}

#[derive(Default)]
pub struct Shellcheck {
    report: Report,
    workflow_shell: Option<String>,
    job_shell: Option<String>,
    runner_shell: Option<&'static str>,
}

impl Rule for Shellcheck {
    fn name(&self) -> &'static str {
        "shellcheck"
    }

    fn report(&mut self) -> &mut Report {
        &mut self.report
    }

    fn visit_workflow_pre(&mut self, workflow: &Workflow) {
        self.workflow_shell = default_shell(workflow.defaults.as_ref());
    }

    fn visit_job_pre(&mut self, job: &Job) {
        self.job_shell = default_shell(job.defaults.as_ref());
        let windows = job
            .runs_on
            .iter()
            .flat_map(|runner| &runner.labels)
            .any(|label| {
                let label = label.value.to_lowercase();
                label == "windows" || label.starts_with("windows-")
            });
        self.runner_shell = windows.then_some("pwsh");
    }

    fn visit_job_post(&mut self, _job: &Job) {
        self.job_shell = None;
        self.runner_shell = None;
    }

    fn visit_step(&mut self, step: &Step) {
        let Some(Exec::Run(run)) = &step.exec else {
            return;
        };
        let (Some(script), Some(pos)) = (&run.run, run.run_pos) else {
            return;
        };
        let shell = run
            .shell
            .as_ref()
            .map(|shell| shell.value.as_str())
            .or(self.job_shell.as_deref())
            .or(self.workflow_shell.as_deref())
            .or(self.runner_shell)
            .unwrap_or("bash");
        if !is_checked(shell) {
            return;
        }
        for finding in check(&sanitize(&script.value)) {
            self.error(
                pos,
                format!(
                    "shellcheck reported issue in this script: SC{}:{}:{}:{}: {}",
                    finding.code.number(),
                    finding.code.level(),
                    finding.line,
                    finding.column,
                    finding.message()
                ),
            );
        }
    }
}
