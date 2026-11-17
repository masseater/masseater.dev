use std::sync::LazyLock;

use regex::Regex;

use crate::entities::workflow::{Exec, Step};
use crate::features::check_workflow::{Report, Rule};
use crate::shared::text::quote;

static COMMAND: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"(?:::(save-state|set-output|set-env)\s+name=[a-zA-Z][a-zA-Z_-]*::\S+|::(add-path)::\S+)",
    )
    .expect("command pattern")
});

#[derive(Default)]
pub struct DeprecatedCommands {
    report: Report,
}

impl Rule for DeprecatedCommands {
    fn name(&self) -> &'static str {
        "deprecated-commands"
    }

    fn report(&mut self) -> &mut Report {
        &mut self.report
    }

    fn visit_step(&mut self, step: &Step) {
        let Some(Exec::Run(run)) = &step.exec else {
            return;
        };
        let Some(script) = &run.run else {
            return;
        };
        for captures in COMMAND.captures_iter(&script.value) {
            let command = captures
                .get(1)
                .or_else(|| captures.get(2))
                .map_or("", |m| m.as_str());
            let alternative = match command {
                "set-output" => "echo \"{name}={value}\" >> $GITHUB_OUTPUT",
                "save-state" => "echo \"{name}={value}\" >> $GITHUB_STATE",
                "set-env" => "echo \"{name}={value}\" >> $GITHUB_ENV",
                _ => "echo \"{path}\" >> $GITHUB_PATH",
            };
            self.error(
                script.pos,
                format!(
                    "workflow command {} was deprecated. use `{alternative}` instead: https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions",
                    quote(command)
                ),
            );
        }
    }
}
