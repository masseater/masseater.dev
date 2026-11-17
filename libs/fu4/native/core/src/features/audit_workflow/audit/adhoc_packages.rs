use anyhow::Context as _;
use subfeature::Subfeature;
use tree_sitter::StreamingIterator as _;

use super::{Audit, AuditLoadError, audit_meta};
use crate::features::audit_workflow::audit::AuditError;
use crate::features::audit_workflow::{
    finding::{Confidence, Finding, Severity},
    models::{StepBodyCommon, StepCommon},
    state::AuditState,
    utils,
};

const BASH_COMMAND_QUERY: &str = "(command name: (_) @cmd argument: (_)+ @args) @span";

const PWSH_COMMAND_QUERY: &str = r"
(command
  name: [
    (command_name) @cmd
    (invocation_operator_command command: (command_argument) @cmd)
  ]
  [
    (command_argument) @args
    (command_parameter) @args
    (redirection)
    (comment)
    (line_continuation)
    (verbatim_arguments)
  ]+
) @span
";

pub(crate) struct AdhocPackages {
    bash_command_query: utils::SpannedQuery,
    pwsh_command_query: utils::SpannedQuery,
}

audit_meta!(
    AdhocPackages,
    "adhoc-packages",
    "ad-hoc installation of packages"
);

impl AdhocPackages {
    fn query<'a>(
        query: &'a utils::SpannedQuery,
        cursor: &'a mut tree_sitter::QueryCursor,
        tree: &'a tree_sitter::Tree,
        source: &'a str,
    ) -> tree_sitter::QueryMatches<'a, 'a, 'static, &'a [u8], &'a [u8]> {
        cursor.matches(query, tree.root_node(), source.as_bytes())
    }

    fn option_takes_value(cmd: &str, option: &str) -> bool {
        match cmd {
            "pnpm" => matches!(option, "-C" | "--dir" | "-F" | "--filter" | "--filter-prod"),
            "yarn" => matches!(option, "--cwd" | "--mutex" | "--cache-folder"),
            _ => false,
        }
    }

    fn next_subcommand<'a>(cmd: &str, args: &mut impl Iterator<Item = &'a str>) -> Option<&'a str> {
        while let Some(arg) = args.next() {
            if arg == "--" {
                return args.next();
            }
            if !arg.starts_with('-') {
                return Some(arg);
            }
            if !arg.contains('=') && Self::option_takes_value(cmd, arg) {
                args.next()?;
            }
        }
        None
    }

    fn is_adhoc_install_command<'a>(cmd: &'a str, args: impl Iterator<Item = &'a str>) -> bool {
        let mut args = args;
        match cmd {
            "gem" => {
                args.any(|arg| arg == "install" || arg == "i")
                    && args.any(|arg| !arg.starts_with('-'))
            }
            "bundle" => args.any(|arg| arg == "add") && args.any(|arg| !arg.starts_with('-')),
            "npm" => {
                let mut args = args.skip_while(|arg| arg.starts_with('-'));
                match args.next() {
                    Some(
                        "install" | "i" | "in" | "ins" | "inst" | "insta" | "instal" | "isnt"
                        | "isnta" | "isntal" | "isntall" | "add",
                    ) => args.any(|arg| !arg.starts_with('-')),
                    _ => false,
                }
            }
            "yarn" | "pnpm" => {
                let subcommand = match (cmd, Self::next_subcommand(cmd, &mut args)) {
                    ("yarn", Some("workspace")) => {
                        args.next();
                        Self::next_subcommand(cmd, &mut args)
                    }

                    ("yarn", Some("global")) | ("pnpm", Some("recursive" | "multi" | "m")) => {
                        Self::next_subcommand(cmd, &mut args)
                    }
                    (_, subcommand) => subcommand,
                };

                matches!(subcommand, Some("add")) && args.any(|arg| !arg.starts_with('-'))
            }
            _ => false,
        }
    }

    fn adhoc_install_candidates<'doc>(
        &self,
        run: &'doc str,
        shell: &str,
    ) -> Result<Vec<Subfeature<'doc>>, AuditError> {
        let normalized = utils::normalize_shell(shell);

        let mut cursor = tree_sitter::QueryCursor::new();
        let (query, tree) = match normalized {
            "bash" | "sh" | "zsh" => {
                let mut parser = utils::bash_parser();
                let tree = parser
                    .parse(run, None)
                    .context("failed to parse `run:` body as bash")
                    .map_err(Self::err)?;
                (&self.bash_command_query, tree)
            }
            "pwsh" | "powershell" => {
                let mut parser = utils::pwsh_parser();
                let tree = parser
                    .parse(run, None)
                    .context("failed to parse `run:` body as pwsh")
                    .map_err(Self::err)?;
                (&self.pwsh_command_query, tree)
            }
            _ => {
                tracing::debug!("unable to analyze 'run:' block: unknown shell '{normalized}'");
                return Ok(vec![]);
            }
        };

        let matches = Self::query(query, &mut cursor, &tree, run);
        let cmd_idx = query
            .capture_index_for_name("cmd")
            .expect("internal error: missing capture index for 'cmd'");
        let args_idx = query
            .capture_index_for_name("args")
            .expect("internal error: missing capture index for 'args'");

        let mut subfeatures = vec![];
        matches.for_each(|mat| {
            let cmd = {
                let cap = mat
                    .captures()
                    .iter()
                    .find(|cap| cap.index == cmd_idx)
                    .expect("internal error: expected capture for cmd");
                cap.node
                    .utf8_text(run.as_bytes())
                    .expect("impossible: capture should be UTF-8 by construction")
            };

            let args = mat
                .captures()
                .iter()
                .filter(|cap| cap.index == args_idx)
                .map(|cap| {
                    cap.node
                        .utf8_text(run.as_bytes())
                        .expect("impossible: capture should be UTF-8 by construction")
                });

            if Self::is_adhoc_install_command(cmd, args) {
                let span = mat
                    .captures()
                    .iter()
                    .find(|cap| cap.index == query.span_idx)
                    .expect("internal error: expected capture for span");

                let span_contents = span
                    .node
                    .utf8_text(run.as_bytes())
                    .expect("impossible: capture should be UTF-8 by construction");

                subfeatures.push(Subfeature::new(span.node.start_byte(), span_contents));
            }
        });

        Ok(subfeatures)
    }

    fn process_step<'doc>(
        &self,
        step: &impl StepCommon<'doc>,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        let mut findings = vec![];

        let Some(StepBodyCommon::Run { run, .. }) = step.body() else {
            return Ok(findings);
        };

        let shell = step.shell().map_or_else(
            || {
                tracing::debug!(
                    "adhoc-packages: couldn't determine shell for step {loc:#?}; assuming bash",
                    loc = step.location()
                );
                "bash"
            },
            |s| s.0,
        );

        for subfeature in self.adhoc_install_candidates(run, shell)? {
            findings.push(
                Self::finding()
                    .severity(Severity::Low)
                    .confidence(Confidence::High)
                    .add_location(step.location().hidden())
                    .add_location(
                        step.location()
                            .with_keys(["run".into()])
                            .key_only()
                            .annotated("this step"),
                    )
                    .add_location(
                        step.location()
                            .primary()
                            .with_keys(["run".into()])
                            .subfeature(subfeature)
                            .annotated("installs a package outside of a lockfile"),
                    )
                    .build(step)?,
            );
        }

        Ok(findings)
    }
}

impl Audit for AdhocPackages {
    fn new(_state: &AuditState) -> Result<Self, AuditLoadError> {
        Ok(Self {
            bash_command_query: utils::SpannedQuery::new(BASH_COMMAND_QUERY, &utils::BASH),
            pwsh_command_query: utils::SpannedQuery::new(PWSH_COMMAND_QUERY, &utils::PWSH),
        })
    }

    fn audit_step<'doc>(
        &self,
        step: &crate::features::audit_workflow::models::workflow::Step<'doc>,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        self.process_step(step)
    }

    fn audit_composite_step<'doc>(
        &self,
        step: &crate::features::audit_workflow::models::action::CompositeStep<'doc>,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        self.process_step(step)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pwsh_install_candidates() {
        let sut = AdhocPackages::new(&AuditState::default()).unwrap();

        for (case, expected) in [
            (". npm install lodash", true),
            ("pnpm --filter core add lodash", true),
            ("pnpm --filter add lint lodash", false),
            ("npm install `\n  --no-fund `\n  lodash", true),
            ("npm install <# package #> lodash", true),
            ("npm install > install.log lodash", true),
            ("npm install > lodash", false),
            ("npm install lodash --% > install.log", true),
            ("npm 'install lodash'", false),
        ] {
            let run = format!("Write-Host '🦀'\n{case}\nWrite-Host done");
            let candidates = sut.adhoc_install_candidates(&run, "pwsh").unwrap();
            if expected {
                assert_eq!(candidates.len(), 1, "{case}");
                let span = candidates[0].locate_within(&run).unwrap();
                assert_eq!(&run[span.as_range()], case, "{case}");
            } else {
                assert!(candidates.is_empty(), "{case}");
            }
        }
    }

    const ADHOC_INSTALL_CASES: &[(&[&str], bool)] = &[
        (&["gem", "install", "rake"], true),
        (&["gem", "install", "rails:7.0.0"], true),
        (&["gem", "install", "rake", "rspec"], true),
        (&["gem", "install", "--no-document", "rake"], true),
        (&["gem", "install", "rails", "--no-document"], true),
        (&["gem", "install", "rake", "-v", "13.0.6"], true),
        (&["gem", "--silent", "install", "rake"], true),
        (&["gem", "i", "rake"], true),
        (&["gem", "i", "--no-document", "rake"], true),
        (&["gem", "install"], false),
        (&["gem", "install", "--help"], false),
        (&["gem", "i"], false),
        (&["gem", "i", "--help"], false),
        (&["gem", "build", "foo.gemspec"], false),
        (&["gem", "push", "foo-0.1.0.gem"], false),
        (&["gem", "env"], false),
        (&["bundle", "install"], false),
        (&["bundle", "add", "rails"], true),
        (&["bundle", "add", "rails:8.1.0"], true),
        (&["bundle", "add", "rails", "--skip-install"], true),
        (&["npm", "install", "lodash"], true),
        (&["npm", "install", "oxlint@1.55.0"], true),
        (&["npm", "install", "--no-fund", "oxlint@1.55.0"], true),
        (&["npm", "install", "oxlint@^1.55.0"], true),
        (&["npm", "i", "lodash"], true),
        (&["npm", "add", "lodash"], true),
        (&["npm", "isnt", "lodash"], true),
        (&["npm", "i", "--no-fund", "oxlint@1.55.0"], true),
        (&["npm", "i", "--help"], false),
        (&["npm", "i"], false),
        (&["npm", "install", "package-with-dashes"], true),
        (&["npm", "install", "--help"], false),
        (&["npm", "install", "--no-fund"], false),
        (&["npm", "ci"], false),
        (&["npx", "foobar"], false),
        (&["npx", "-y", "foobar"], false),
        (&["npx", "--yes", "foobar"], false),
        (&["npx", "foobar@1.2.3"], false),
        (&["pip", "install", "requests"], false),
        (&["yarn", "add", "lodash"], true),
        (&["yarn", "add", "--dev", "oxlint@1.55.0"], true),
        (&["yarn", "add", "oxlint@^1.55.0"], true),
        (&["yarn", "install"], false),
        (&["yarn", "install", "--frozen-lockfile"], false),
        (&["pnpm", "add", "lodash"], true),
        (&["pnpm", "add", "--no-fund", "oxlint@1.55.0"], true),
        (&["pnpm", "add", "oxlint@^1.55.0"], true),
        (&["pnpm", "install"], false),
        (&["pnpm", "install", "--frozen-lockfile"], false),
        (&["pnpm", "exec", "changeset", "add", "lodash"], false),
        (&["pnpm", "dlx", "changeset", "add", "lodash"], false),
        (&["pnpm", "run", "build", "add", "lodash"], false),
        (&["yarn", "exec", "changeset", "add", "lodash"], false),
        (&["yarn", "run", "lint", "add", "lodash"], false),
        (&["pnpm", "test", "add", "lodash"], false),
        (&["pnpm", "lint", "add", "lodash"], false),
        (&["pnpm", "-r", "add", "lodash"], true),
        (&["pnpm", "-r", "lint", "add", "lodash"], false),
        (&["pnpm", "-C", "./sub", "add", "lodash"], true),
        (&["pnpm", "--dir", "./sub", "add", "lodash"], true),
        (&["pnpm", "-F", "core", "add", "lodash"], true),
        (&["pnpm", "--filter-prod", "core", "add", "lodash"], true),
        (&["yarn", "--cwd", "./sub", "add", "lodash"], true),
        (&["yarn", "--mutex", "file", "add", "lodash"], true),
        (
            &["yarn", "--cache-folder", "./cache", "add", "lodash"],
            true,
        ),
        (&["pnpm", "--filter", "./pkgs/core/", "add", "lodash"], true),
        (&["pnpm", "--filter=./pkgs/core/", "add", "lodash"], true),
        (
            &["pnpm", "--filter=./pkgs/core/", "lint", "add", "lodash"],
            false,
        ),
        (&["pnpm", "--filter", "add", "test"], false),
        (&["pnpm", "--filter", "add", "add", "lodash"], true),
        (&["yarn", "--cwd", "add", "run", "lint"], false),
        (&["pnpm", "--filter"], false),
        (&["pnpm", "--filter", "core", "add"], false),
        (&["pnpm", "--unknown", "add", "lodash"], true),
        (&["pnpm", "--unknown", "lint", "add", "lodash"], false),
        (&["pnpm", "--", "--filter", "add", "lodash"], false),
        (&["yarn", "workspace", "@acme/core", "add", "lodash"], true),
        (
            &["yarn", "workspace", "@acme/core", "build", "add", "lodash"],
            false,
        ),
        (
            &["yarn", "--silent", "workspace", "core", "add", "lodash"],
            true,
        ),
        (
            &[
                "yarn",
                "--non-interactive",
                "workspace",
                "core",
                "add",
                "lodash",
            ],
            true,
        ),
        (&["yarn", "global", "add", "typescript"], true),
        (&["yarn", "global", "add"], false),
        (&["yarn", "global", "list", "add", "lodash"], false),
        (&["pnpm", "recursive", "add", "lodash"], true),
        (&["pnpm", "multi", "add", "lodash"], true),
        (&["pnpm", "m", "add", "lodash"], true),
        (&["pnpm", "recursive", "add"], false),
        (
            &["pnpm", "recursive", "--filter", "core", "add", "lodash"],
            true,
        ),
        (
            &["pnpm", "recursive", "exec", "changeset", "add", "lodash"],
            false,
        ),
        (&["pnpm", "workspace", "core", "add", "lodash"], false),
        (&["pnpm", "global", "add", "lodash"], false),
        (&["yarn", "recursive", "add", "lodash"], false),
    ];

    #[test]
    fn test_is_adhoc_install_command() {
        for (args, expected) in ADHOC_INSTALL_CASES {
            let cmd = args[0];
            let args_iter = args[1..].iter().copied();
            assert_eq!(
                super::AdhocPackages::is_adhoc_install_command(cmd, args_iter),
                *expected,
                "cmd: {cmd:?}, args: {args:?}"
            );
        }
    }
}
