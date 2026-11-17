use crate::entities::workflow::{Env, Job, Step, Workflow};
use crate::features::check_workflow::{Report, Rule};
use crate::shared::text::quote;

#[derive(Default)]
pub struct EnvVar {
    report: Report,
}

impl EnvVar {
    fn check_env(&mut self, env: Option<&Env>) {
        let Some(env) = env else {
            return;
        };
        if env.expression.is_some() {
            return;
        }
        for var in env.vars.values() {
            if var.name.contains_expression() {
                continue;
            }
            if var.name.value.contains(['&', '=', ' ', '\t']) {
                self.error(
                    var.name.pos,
                    format!(
                        "environment variable name {} is invalid. '&', '=' and spaces should not be contained",
                        quote(&var.name.value)
                    ),
                );
            }
        }
    }
}

impl Rule for EnvVar {
    fn name(&self) -> &'static str {
        "env-var"
    }

    fn report(&mut self) -> &mut Report {
        &mut self.report
    }

    fn visit_step(&mut self, step: &Step) {
        self.check_env(step.env.as_ref());
    }

    fn visit_job_pre(&mut self, job: &Job) {
        self.check_env(job.env.as_ref());
        if let Some(container) = &job.container {
            self.check_env(container.env.as_ref());
        }
        for service in job.services.iter().flat_map(|s| s.value.values()) {
            self.check_env(service.container.env.as_ref());
        }
    }

    fn visit_workflow_pre(&mut self, workflow: &Workflow) {
        self.check_env(workflow.env.as_ref());
    }
}
