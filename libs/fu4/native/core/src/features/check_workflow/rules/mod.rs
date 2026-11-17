mod action;
mod credentials;
mod deprecated_commands;
mod env_var;
mod events;
mod glob;
mod id;
mod if_cond;
mod job_needs;
mod matrix;
mod permissions;
mod runner_label;
mod shell_name;
mod workflow_call;

use super::{Context, Rule};

pub fn all(context: &Context) -> Vec<Box<dyn Rule>> {
    let labels = context
        .project
        .as_ref()
        .map(|p| p.config.labels.clone())
        .unwrap_or_default();
    vec![
        Box::new(matrix::Matrix::default()),
        Box::new(credentials::Credentials::default()),
        Box::new(shell_name::ShellName::default()),
        Box::new(runner_label::RunnerLabel::new(labels)),
        Box::new(events::Events::default()),
        Box::new(job_needs::JobNeeds::default()),
        Box::new(action::Action::new(context.project.clone())),
        Box::new(env_var::EnvVar::default()),
        Box::new(id::Id::default()),
        Box::new(glob::Glob::default()),
        Box::new(permissions::Permissions::default()),
        Box::new(workflow_call::WorkflowCall::new(
            context.path.clone(),
            context.project.clone(),
        )),
        Box::new(deprecated_commands::DeprecatedCommands::default()),
        Box::new(if_cond::IfCond::default()),
    ]
}
