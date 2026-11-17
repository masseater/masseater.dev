mod config;
mod rule;
mod rules;

#[cfg(test)]
mod conformance;

use std::path::PathBuf;
use std::sync::Arc;

use crate::entities::action::LocalActions;
use crate::entities::reusable_workflow::LocalWorkflows;
use crate::entities::workflow::{Workflow, parse};
use crate::shared::diagnostic::Diagnostic;

pub use config::{CONFIG_NAME, Compiled, Config, PathConfig, SelfHostedRunner};
pub use rule::{Report, Rule};

pub struct Project {
    pub root: PathBuf,
    pub config: Compiled,
    pub actions: LocalActions,
    pub workflows: LocalWorkflows,
}

impl Project {
    #[must_use]
    pub fn new(root: PathBuf, config: &Config) -> Result<Arc<Self>, String> {
        Ok(Arc::new(Self {
            root,
            config: config.compile()?,
            actions: LocalActions::default(),
            workflows: LocalWorkflows::default(),
        }))
    }
}

pub struct Context {
    pub path: String,
    pub project: Option<Arc<Project>>,
}

fn visit(workflow: &Workflow, rules: &mut [Box<dyn Rule>]) {
    for rule in rules.iter_mut() {
        rule.visit_workflow_pre(workflow);
    }
    for job in workflow.jobs.iter().flat_map(|jobs| jobs.values()) {
        for rule in rules.iter_mut() {
            rule.visit_job_pre(job);
        }
        for step in job.steps.iter().flatten() {
            for rule in rules.iter_mut() {
                rule.visit_step(step);
            }
        }
        for rule in rules.iter_mut() {
            rule.visit_job_post(job);
        }
    }
    for rule in rules.iter_mut() {
        rule.visit_workflow_post(workflow);
    }
}

#[must_use]
pub fn check(context: &Context, source: &str) -> Vec<Diagnostic> {
    let parsed = parse(source);
    let mut all = parsed.errors;
    if let Some(workflow) = parsed.workflow {
        let mut rules = rules::all(context);
        visit(&workflow, &mut rules);
        for rule in &mut rules {
            all.append(&mut rule.report().errors);
        }
    }
    all.sort_by(|a, b| a.pos.cmp(&b.pos).then_with(|| a.message.cmp(&b.message)));
    all.dedup_by(|a, b| a.pos == b.pos && a.message == b.message);
    if let Some(project) = &context.project {
        all.retain(|d| !project.config.ignores(&context.path, &d.message));
    }
    all
}
