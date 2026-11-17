use std::{sync::LazyLock, vec};

use anyhow::Context as _;
use subfeature::Subfeature;
use tree_sitter::StreamingIterator as _;

use super::{Audit, AuditLoadError, audit_meta};
use crate::features::audit_workflow::audit::AuditError;
use crate::features::audit_workflow::finding::location::Locatable as _;
use crate::features::audit_workflow::{
    finding::{Confidence, Finding, Severity},
    models::{
        StepBodyCommon, StepCommon,
        coordinate::{ActionCoordinate, ControlExpr, ControlFieldType, Toggle},
    },
    state::AuditState,
    utils,
};

const USES_MANUAL_CREDENTIAL: &str =
    "uses a manually-configured credential instead of Trusted Publishing";

const KNOWN_RUBY_TP_INDICES: &[&str] = &["https://rubygems.org"];

const KNOWN_PYTHON_TP_INDICES: &[&str] = &[
    "https://upload.pypi.org/legacy/",
    "https://test.pypi.org/legacy/",
];

const KNOWN_NPMJS_TP_INDICES: &[&str] =
    &["https://registry.npmjs.org", "https://registry.npmjs.org/"];

static KNOWN_TRUSTED_PUBLISHING_ACTIONS: LazyLock<Vec<(ActionCoordinate, &[&str])>> =
    LazyLock::new(|| {
        vec![
            (
                ActionCoordinate::Configurable {
                    uses_pattern: "pypa/gh-action-pypi-publish".parse().unwrap(),
                    control: ControlExpr::all([
                        ControlExpr::field(
                            Toggle::OptIn,
                            "password",
                            ControlFieldType::FreeString,
                            false,
                        ),
                        ControlExpr::all([
                            ControlExpr::field(
                                Toggle::OptIn,
                                "repository-url",
                                ControlFieldType::Exact(KNOWN_PYTHON_TP_INDICES),
                                true,
                            ),
                            ControlExpr::field(
                                Toggle::OptIn,
                                "repository_url",
                                ControlFieldType::Exact(KNOWN_PYTHON_TP_INDICES),
                                true,
                            ),
                        ]),
                    ]),
                },
                &["with", "password"],
            ),
            (
                ActionCoordinate::Configurable {
                    uses_pattern: "rubygems/release-gem".parse().unwrap(),
                    control: ControlExpr::not(ControlExpr::field(
                        Toggle::OptIn,
                        "setup-trusted-publisher",
                        ControlFieldType::Boolean,
                        true,
                    )),
                },
                &["with", "setup-trusted-publisher"],
            ),
            (
                ActionCoordinate::Configurable {
                    uses_pattern: "rubygems/configure-rubygems-credentials".parse().unwrap(),
                    control: ControlExpr::all([
                        ControlExpr::field(
                            Toggle::OptIn,
                            "api-token",
                            ControlFieldType::FreeString,
                            false,
                        ),
                        ControlExpr::field(
                            Toggle::OptIn,
                            "gem-server",
                            ControlFieldType::Exact(KNOWN_RUBY_TP_INDICES),
                            true,
                        ),
                    ]),
                },
                &["with", "api-token"],
            ),
            (
                ActionCoordinate::Configurable {
                    uses_pattern: "actions/setup-node".parse().unwrap(),
                    control: ControlExpr::all([
                        ControlExpr::field(
                            Toggle::OptIn,
                            "registry-url",
                            ControlFieldType::Exact(KNOWN_NPMJS_TP_INDICES),
                            true,
                        ),
                        ControlExpr::field(
                            Toggle::OptIn,
                            "always-auth",
                            ControlFieldType::Boolean,
                            false,
                        ),
                    ]),
                },
                &["with", "always-auth"],
            ),
        ]
    });

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

pub(crate) struct UseTrustedPublishing {
    bash_command_query: utils::SpannedQuery,
    pwsh_command_query: utils::SpannedQuery,
}

audit_meta!(
    UseTrustedPublishing,
    "use-trusted-publishing",
    "prefer trusted publishing for authentication"
);

impl UseTrustedPublishing {
    fn query<'a>(
        query: &'a utils::SpannedQuery,
        cursor: &'a mut tree_sitter::QueryCursor,
        tree: &'a tree_sitter::Tree,
        source: &'a str,
    ) -> tree_sitter::QueryMatches<'a, 'a, 'static, &'a [u8], &'a [u8]> {
        cursor.matches(query, tree.root_node(), source.as_bytes())
    }

    fn is_publish_command<'a>(cmd: &'a str, args: impl Iterator<Item = &'a str>) -> bool {
        let mut args = args;

        match cmd {
            "cargo" => {
                args.any(|arg| arg == "publish")
                    && args.all(|arg| arg != "--dry-run" && arg != "-n")
            }
            "uv" => match args.find(|arg| *arg == "publish" || *arg == "run") {
                Some("publish") => args.all(|arg| arg != "--dry-run"),
                Some("run") => args.any(|arg| arg == "twine") && args.any(|arg| arg == "upload"),
                _ => false,
            },
            "uvx" => args.any(|arg| arg.starts_with("twine")) && args.any(|arg| arg == "upload"),
            "hatch" | "pdm" => args.any(|arg| arg == "publish"),
            "poetry" => args.any(|arg| arg == "publish") && args.all(|arg| arg != "--dry-run"),
            "twine" => args.any(|arg| arg == "upload"),
            "pipx" => {
                args.any(|arg| arg == "run")
                    && args.any(|arg| arg.starts_with("twine"))
                    && args.any(|arg| arg == "upload")
            }
            _ if cmd.starts_with("python") => {
                args.any(|arg| arg == "-m")
                    && args.any(|arg| arg == "twine")
                    && args.any(|arg| arg == "upload")
            }
            "gem" => args.any(|arg| arg == "push"),
            "bundle" => {
                args.any(|arg| arg == "exec")
                    && args.any(|arg| arg == "gem")
                    && args.any(|arg| arg == "push")
            }
            "npm" => args.any(|arg| arg == "publish") && args.all(|arg| arg != "--dry-run"),
            "yarn" => match args.find(|arg| *arg == "publish" || *arg == "npm") {
                Some("publish") => true,
                Some("npm") => {
                    args.any(|arg| arg == "publish")
                        && args.all(|arg| arg != "--dry-run" && arg != "-n")
                }
                _ => false,
            },
            "pnpm" => args.any(|arg| arg == "publish") && args.all(|arg| arg != "--dry-run"),
            "bunx" => match args.find(|arg| *arg == "npm" || arg.starts_with("npm@")) {
                Some(_) => args.any(|arg| arg == "publish") && args.all(|arg| arg != "--dry-run"),
                None => false,
            },
            "bun" => args.any(|arg| arg == "publish") && args.all(|arg| arg != "--dry-run"),
            "nuget" | "nuget.exe" => args.any(|arg| arg == "push"),
            "dotnet" => args.any(|arg| arg == "nuget") && args.any(|arg| arg == "push"),
            _ => false,
        }
    }

    fn process_step<'doc>(step: &impl StepCommon<'doc>) -> Result<Vec<Finding<'doc>>, AuditError> {
        let mut findings = vec![];

        for (coordinate, keys) in KNOWN_TRUSTED_PUBLISHING_ACTIONS.iter() {
            if coordinate.usage(step).is_some() {
                findings.push(
                    Self::finding()
                        .severity(Severity::Informational)
                        .confidence(Confidence::High)
                        .add_location(step.location().hidden())
                        .add_location(
                            step.location()
                                .primary()
                                .with_keys(["uses".into()])
                                .annotated("this step"),
                        )
                        .add_location(
                            step.location()
                                .primary()
                                .with_keys(keys.iter().map(|k| (*k).into()))
                                .annotated(USES_MANUAL_CREDENTIAL),
                        )
                        .build(step)?,
                );
            }
        }

        Ok(findings)
    }

    fn trusted_publishing_command_candidates<'doc>(
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
        let cmd = query
            .capture_index_for_name("cmd")
            .expect("internal error: missing capture index for 'cmd'");
        let args = query
            .capture_index_for_name("args")
            .expect("internal error: missing capture index for 'args'");

        let mut subfeatures = vec![];
        matches.for_each(|mat| {
            let cmd = {
                let cap = mat
                    .captures()
                    .iter()
                    .find(|cap| cap.index == cmd)
                    .expect("internal error: expected capture for cmd");
                cap.node
                    .utf8_text(run.as_bytes())
                    .expect("impossible: capture should be UTF-8 by construction")
            };

            let args = mat
                .captures()
                .iter()
                .filter(|cap| cap.index == args)
                .map(|cap| {
                    cap.node
                        .utf8_text(run.as_bytes())
                        .expect("impossible: capture should be UTF-8 by construction")
                });

            if Self::is_publish_command(cmd, args) {
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
}

impl Audit for UseTrustedPublishing {
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
    ) -> Result<Vec<super::Finding<'doc>>, AuditError> {
        let mut findings = Self::process_step(step)?;

        if let Some(StepBodyCommon::Run { run, .. }) = step.body()
            && !step.parent.has_id_token()
        {
            let shell = step.shell().map_or_else(|| {
                tracing::debug!(
                    "use-trusted-publishing: couldn't determine shell type for {workflow} step {loc:#?}",
                    workflow = step.workflow().key.filename(),
                    loc = step.location(),
                );

                "bash"
            }, |s| s.0);

            for subfeature in self.trusted_publishing_command_candidates(run, shell)? {
                findings.push(
                    Self::finding()
                        .severity(Severity::Informational)
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
                                .annotated("this command"),
                        )
                        .build(step)?,
                );
            }
        }

        Ok(findings)
    }

    fn audit_composite_step<'doc>(
        &self,
        step: &crate::features::audit_workflow::models::action::CompositeStep<'doc>,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        Self::process_step(step)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pwsh_publishing_candidates() {
        let sut = UseTrustedPublishing::new(&AuditState::default()).unwrap();

        for (case, expected) in [
            ("& cargo publish", true),
            ("& cargo publish --dry-run", false),
            ("cargo publish `\n  --dry-run", false),
            ("cargo publish <# comment #> --dry-run", false),
            ("cargo publish > publish.log --dry-run", false),
            ("cargo build > publish", false),
            ("cargo build --% \"| cargo publish\"", false),
            ("python -m twine upload dist/*", true),
        ] {
            let run = format!("Write-Host '🦀'\n{case}\nWrite-Host done");
            let candidates = sut
                .trusted_publishing_command_candidates(&run, "pwsh")
                .unwrap();
            if expected {
                assert_eq!(candidates.len(), 1, "{case}");
                let span = candidates[0].locate_within(&run).unwrap();
                assert_eq!(&run[span.as_range()], case, "{case}");
            } else {
                assert!(candidates.is_empty(), "{case}");
            }
        }
    }

    #[test]
    fn test_is_publish_command() {
        for (args, is_publish_command) in &[
            (&["cargo", "publish"][..], true),
            (&["cargo", "publish", "-p", "foo"][..], true),
            (&["cargo", "publish", "--dry-run"][..], false),
            (&["cargo", "publish", "-n"][..], false),
            (&["cargo", "build"][..], false),
            (&["uv", "publish"][..], true),
            (&["uv", "publish", "dist/*"][..], true),
            (&["uv", "publish", "--dry-run"][..], false),
            (&["uv", "run", "--dev", "twine", "upload"][..], true),
            (&["uv", "run", "twine", "upload"][..], true),
            (&["uv"][..], false),
            (&["uv", "sync"][..], false),
            (&["uvx", "twine", "upload"][..], true),
            (&["uvx", "twine@3.4.1", "upload"][..], true),
            (&["uvx", "twine@6.1.0", "upload"][..], true),
            (&["uvx", "twine"][..], false),
            (&["poetry", "publish"][..], true),
            (&["poetry", "publish", "--dry-run"][..], false),
            (&["hatch", "publish"][..], true),
            (&["pdm", "publish"][..], true),
            (&["twine", "upload", "dist/*"][..], true),
            (&["pipx", "run", "twine", "upload", "dist/*"][..], true),
            (
                &["pipx", "run", "twine==3.4.1", "upload", "dist/*"][..],
                true,
            ),
            (
                &["pipx", "run", "twine==6.1.0", "upload", "dist/*"][..],
                true,
            ),
            (&["python", "-m", "twine", "upload", "dist/*"][..], true),
            (&["python3.9", "-m", "twine", "upload", "dist/*"][..], true),
            (&["twine", "check", "dist/*"], false),
            (&["gem", "push", "mygem-0.1.0.gem"][..], true),
            (
                &["bundle", "exec", "gem", "push", "mygem-0.1.0.gem"][..],
                true,
            ),
            (&["npm", "publish"][..], true),
            (&["npm", "run", "publish"][..], true),
            (&["npm", "publish", "--dry-run"][..], false),
            (&["yarn", "npm"][..], false),
            (&["yarn", "npm", "publish"][..], true),
            (&["yarn", "publish"][..], true),
            (&["yarn", "npm", "publish", "--dry-run"][..], false),
            (&["pnpm", "publish"][..], true),
            (&["pnpm", "publish", "--dry-run"][..], false),
            (&["bunx", "npm", "publish"][..], true),
            (&["bunx", "npm@11", "publish"][..], true),
            (&["bunx", "npm", "publish", "--dry-run"][..], false),
            (&["bunx", "npm", "view", "lodash"][..], false),
            (&["bun", "publish"][..], true),
            (&["bun", "publish", "--access", "public"][..], true),
            (&["bun", "publish", "--dry-run"][..], false),
            (&["bun", "install"][..], false),
            (&["nuget", "push", "MyPackage.nupkg"][..], true),
            (&["nuget.exe", "push", "MyPackage.nupkg"][..], true),
            (&["dotnet", "nuget", "push", "MyPackage.nupkg"][..], true),
            (&["dotnet", "build"][..], false),
        ] {
            let cmd = args[0];
            let args_iter = args[1..].iter().copied();
            assert_eq!(
                super::UseTrustedPublishing::is_publish_command(cmd, args_iter),
                *is_publish_command,
                "cmd: {cmd:?}, args: {args:?}"
            );
        }
    }
}
