use std::ops::Range;

use anyhow::{Context as _, Result};
use github_actions_models::action;
use github_actions_models::workflow::job;
use tree_sitter::{
    Language, Parser, QueryCapture, QueryCursor, QueryMatches, StreamingIterator as _, Tree,
};

use super::{Audit, AuditLoadError, audit_meta};
use crate::features::audit_workflow::audit::AuditError;
use crate::features::audit_workflow::finding::location::Locatable as _;
use crate::features::audit_workflow::finding::{Confidence, Finding, Severity};
use crate::features::audit_workflow::models::StepCommon as _;
use crate::features::audit_workflow::models::workflow::{Step, StepInner};
use crate::features::audit_workflow::state::AuditState;
use crate::features::audit_workflow::utils;
use crate::features::audit_workflow::utils::once::static_regex;

static_regex!(
    GITHUB_ENV_WRITE_CMD,
    r#"(?mi)^.+\s*>>?\s*"?%(?<destination>GITHUB_ENV|GITHUB_PATH)%"?.*$"#
);

pub(crate) struct GitHubEnv {
    bash: Language,
    pwsh: Language,

    bash_redirect_query: utils::SpannedQuery,
    bash_pipeline_query: utils::SpannedQuery,
    pwsh_redirect_query: utils::SpannedQuery,
    pwsh_pipeline_query: utils::SpannedQuery,
}

audit_meta!(GitHubEnv, "github-env", "dangerous use of environment file");

const BASH_REDIRECT_QUERY: &str = r#"
(redirected_statement
 (
   (command name: (command_name) @cmd argument: (_)* @args)
 )
 (file_redirect (
   [
     (string (_ (variable_name) @destination))
     (expansion (variable_name) @destination)
     (simple_expansion (variable_name) @destination)
   ]
 ))
 (#match? @destination "^(GITHUB_ENV|GITHUB_PATH)$")
) @span
"#;

const BASH_PIPELINE_QUERY: &str = r#"
(pipeline
  (command
    name: (command_name) @cmd
    argument: [
      (string (_ (variable_name) @destination))
      (expansion (variable_name) @destination)
      (simple_expansion (variable_name) @destination)
    ]
  )
  (#match? @cmd "tee")
  (#match? @destination "^(GITHUB_ENV|GITHUB_PATH)$")
) @span
"#;

const PWSH_REDIRECT_QUERY: &str = r#"
(redirection
  operator: (file_redirection_operator)
  destination: (command_argument
    [
      (expandable_string (variable) @destination)
      (variable) @destination
    ]
  )
  (#match? @destination "(?i)ENV:GITHUB_ENV|ENV:GITHUB_PATH")
) @span
"#;

const PWSH_PIPELINE_QUERY: &str = r#"
(pipeline
  elements: (command
    name: (command_name) @cmd
    [
      (command_argument
        [
          (expandable_string (variable) @destination)
          (variable) @destination
          (array_literal_expression
            (command_argument
              [
                (expandable_string (variable) @destination)
                (variable) @destination
              ]))
        ])
      (command_parameter
        value: (command_argument
          [
            (expandable_string (variable) @destination)
            (variable) @destination
            (array_literal_expression
              (command_argument
                [
                  (expandable_string (variable) @destination)
                  (variable) @destination
                ]))
          ]))
    ]
  )
  (#match? @cmd "(?i)out-file|add-content|set-content|tee-object")
  (#match? @destination "(?i)ENV:GITHUB_ENV|ENV:GITHUB_PATH")
) @span
"#;

impl GitHubEnv {
    fn bash_echo_arg_is_safe(arg: &QueryCapture<'_>) -> bool {
        arg.node.kind() == "word"
            || arg.node.kind() == "raw_string"
            || (arg.node.named_child_count() == 1
                && arg.node.named_child(0).map(|c| c.kind()) == Some("string_content"))
    }

    fn bash_echo_args_are_safe<'a>(mut args: impl Iterator<Item = &'a QueryCapture<'a>>) -> bool {
        args.all(|cap| Self::bash_echo_arg_is_safe(cap))
    }

    fn query<'a>(
        query: &'a utils::SpannedQuery,
        cursor: &'a mut QueryCursor,
        tree: &'a Tree,
        source: &'a str,
    ) -> QueryMatches<'a, 'a, 'static, &'a [u8], &'a [u8]> {
        cursor.matches(query, tree.root_node(), source.as_bytes())
    }

    fn bash_uses_github_env<'hay>(
        &self,
        script_body: &'hay str,
    ) -> Result<Vec<(&'hay str, Range<usize>)>, AuditError> {
        let mut parser = Parser::new();
        parser
            .set_language(&self.bash)
            .context("failed to set bash language for parser")
            .map_err(Self::err)?;

        let mut cursor = QueryCursor::new();

        let tree = parser
            .parse(script_body, None)
            .context("failed to parse `run:` body as bash")
            .map_err(Self::err)?;

        let matches = Self::query(&self.bash_redirect_query, &mut cursor, &tree, script_body);
        let cmd = self
            .bash_redirect_query
            .capture_index_for_name("cmd")
            .expect("internal error: missing capture index for 'cmd'");
        let args = self
            .bash_redirect_query
            .capture_index_for_name("args")
            .expect("internal error: missing capture index for 'args'");
        let destination = self
            .bash_redirect_query
            .capture_index_for_name("destination")
            .expect("internal error: missing capture index for 'destination'");

        let mut matching_spans = vec![];

        matches.for_each(|mat| {
            let cmd = {
                let cap = mat
                    .captures()
                    .iter()
                    .find(|cap| cap.index == cmd)
                    .expect("internal error: expected capture for cmd");
                cap.node
                    .utf8_text(script_body.as_bytes())
                    .expect("impossible: capture should be UTF-8 by construction")
            };

            let args = mat.captures().iter().filter(|cap| cap.index == args);

            if (cmd != "echo" && cmd != "printf") || !Self::bash_echo_args_are_safe(args) {
                let span = mat
                    .captures()
                    .iter()
                    .find(|cap| cap.index == self.bash_redirect_query.span_idx)
                    .expect("internal error: expected capture for span");

                let destination = {
                    let cap = mat
                        .captures()
                        .iter()
                        .find(|cap| cap.index == destination)
                        .expect("internal error: expected capture for destination");
                    cap.node
                        .utf8_text(script_body.as_bytes())
                        .expect("impossible: capture should be UTF-8 by construction")
                };
                matching_spans.push((destination, span.node.byte_range()));
            }
        });

        let queries = [&self.bash_pipeline_query];

        for query in queries {
            let destination = query.capture_index_for_name("destination").expect(
                "internal error: missing capture index for 'destination' in bash pipeline query",
            );
            let matches = Self::query(query, &mut cursor, &tree, script_body);

            matches.for_each(|mat| {
                let span = mat
                    .captures()
                    .iter()
                    .find(|cap| cap.index == query.span_idx)
                    .expect("internal error: expected capture for span");

                let destination = {
                    let cap = mat
                        .captures()
                        .iter()
                        .find(|cap| cap.index == destination)
                        .expect("internal error: expected capture for destination");
                    cap.node
                        .utf8_text(script_body.as_bytes())
                        .expect("impossible: capture should be UTF-8 by construction")
                };

                matching_spans.push((destination, span.node.byte_range()));
            });
        }

        Ok(matching_spans)
    }

    fn cmd_uses_github_env(script_body: &str) -> Vec<(&str, Range<usize>)> {
        GITHUB_ENV_WRITE_CMD
            .captures_iter(script_body)
            .map(|c| {
                let dest = c
                    .name("destination")
                    .expect("internal error: capture with missing destination");

                (dest.as_str(), dest.range())
            })
            .collect()
    }

    fn pwsh_uses_github_env<'hay>(
        &self,
        script_body: &'hay str,
    ) -> Result<Vec<(&'hay str, Range<usize>)>, AuditError> {
        let mut parser = Parser::new();
        parser
            .set_language(&self.pwsh)
            .context("failed to set pwsh language for parser")
            .map_err(Self::err)?;

        let tree = parser
            .parse(script_body, None)
            .context("failed to parse `run:` body as pwsh")
            .map_err(Self::err)?;

        let mut cursor = QueryCursor::new();
        let queries = [&self.pwsh_redirect_query, &self.pwsh_pipeline_query];
        let mut matching_spans = vec![];

        for query in queries {
            let destination = query
                .capture_index_for_name("destination")
                .expect("internal error: missing capture index for 'destination' in pwsh query");
            let matches = Self::query(query, &mut cursor, &tree, script_body);
            matches.for_each(|mat| {
                let span = mat
                    .captures()
                    .iter()
                    .find(|cap| cap.index == query.span_idx)
                    .expect("internal error: no matching capture");

                let destination = {
                    let cap = mat
                        .captures()
                        .iter()
                        .find(|cap| cap.index == destination)
                        .expect("internal error: no matching capture");
                    cap.node
                        .utf8_text(script_body.as_bytes())
                        .expect("impossible: capture should be UTF-8 by construction")
                };

                matching_spans.push((destination, span.node.byte_range()));
            });
        }

        Ok(matching_spans)
    }

    fn uses_github_env<'hay>(
        &self,
        run_step_body: &'hay str,
        shell: &str,
    ) -> Result<Vec<(&'hay str, Range<usize>)>, AuditError> {
        let normalized = utils::normalize_shell(shell);

        match normalized {
            "bash" | "sh" | "zsh" => self.bash_uses_github_env(run_step_body),
            "cmd" => Ok(Self::cmd_uses_github_env(run_step_body)),
            "pwsh" | "powershell" => self.pwsh_uses_github_env(run_step_body),

            &_ => {
                tracing::warn!(
                    "'{shell}' ({normalized}) shell not supported when evaluating usage of GITHUB_ENV"
                );
                Ok(vec![])
            }
        }
    }
}

impl Audit for GitHubEnv {
    fn new(_state: &AuditState) -> Result<Self, AuditLoadError>
    where
        Self: Sized,
    {
        let bash: Language = tree_sitter_bash::LANGUAGE.into();
        let mut bash_parser = Parser::new();
        bash_parser
            .set_language(&bash)
            .context("failed to load bash parser")
            .map_err(AuditLoadError::Skip)?;

        let pwsh = tree_sitter_powershell::LANGUAGE.into();
        let mut pwsh_parser = Parser::new();
        pwsh_parser
            .set_language(&pwsh)
            .context("failed to load powershell parser")
            .map_err(AuditLoadError::Skip)?;

        Ok(Self {
            bash_redirect_query: utils::SpannedQuery::new(BASH_REDIRECT_QUERY, &bash),
            bash_pipeline_query: utils::SpannedQuery::new(BASH_PIPELINE_QUERY, &bash),
            pwsh_redirect_query: utils::SpannedQuery::new(PWSH_REDIRECT_QUERY, &pwsh),
            pwsh_pipeline_query: utils::SpannedQuery::new(PWSH_PIPELINE_QUERY, &pwsh),
            bash,
            pwsh,
        })
    }

    fn audit_step<'doc>(
        &self,
        step: &Step<'doc>,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        let mut findings = vec![];

        let workflow = step.workflow();

        let has_dangerous_triggers =
            workflow.workflow_run().is_some() || workflow.pull_request_target().is_some();

        if !has_dangerous_triggers {
            return Ok(findings);
        }

        if let StepInner::Run(job::RunStep { run, .. }) = &&**step {
            let shell = step.shell().map_or_else(|| {
                tracing::warn!(
                    "github-env: couldn't determine shell type for {workflow} step {loc:#?}; assuming bash",
                    workflow = step.workflow().key.presentation_path(),
                    loc = step.location(),
                );

                "bash"
            }, |s| s.0);

            for (dest, _span) in self.uses_github_env(run, shell)? {
                findings.push(
                    Self::finding()
                        .severity(Severity::High)
                        .confidence(Confidence::Low)
                        .add_location(
                            step.location()
                                .primary()
                                .with_keys(["run".into()])
                                .annotated(format!("write to {dest} may allow code execution")),
                        )
                        .build(step)?,
                );
            }
        }

        Ok(findings)
    }

    fn audit_composite_step<'doc>(
        &self,
        step: &super::CompositeStep<'doc>,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        let mut findings = vec![];

        let action::StepBody::Run { run, .. } = &step.body else {
            return Ok(findings);
        };

        let shell = step.shell().map_or_else(|| {
            tracing::warn!(
                "github-env: couldn't determine shell type for {action} step {stepno}; assuming bash",
                action = step.action().key.presentation_path(),
                stepno = step.index
            );

            "bash"
        }, |s| s.0);

        for (dest, _span) in self.uses_github_env(run, shell)? {
            findings.push(
                Self::finding()
                    .severity(Severity::High)
                    .confidence(Confidence::Low)
                    .add_location(
                        step.location()
                            .primary()
                            .with_keys(["run".into()])
                            .annotated(format!("write to {dest} may allow code execution")),
                    )
                    .build(step)?,
            );
        }

        Ok(findings)
    }
}

#[cfg(test)]
mod tests {
    use crate::features::audit_workflow::audit::Audit as _;
    use crate::features::audit_workflow::audit::github_env::{GITHUB_ENV_WRITE_CMD, GitHubEnv};
    use crate::features::audit_workflow::state::AuditState;

    #[test]
    fn test_exploitable_bash_patterns() {
        for (case, expected) in &[
            ("echo $foo >> $GITHUB_ENV", true),
            ("echo $foo $bar >> $GITHUB_ENV", true),
            ("echo multiple-args $foo >> $GITHUB_ENV", true),
            ("echo $foo multiple-args >> $GITHUB_ENV", true),
            ("echo $foo >> \"$GITHUB_ENV\"", true),
            ("echo $foo >> ${GITHUB_ENV}", true),
            ("echo $foo >> \"${GITHUB_ENV}\"", true),
            ("echo FOO=$(bar) >> $GITHUB_ENV", true),
            ("echo FOO=`bar` >> $GITHUB_ENV", true),
            ("echo $(bar) >> $GITHUB_ENV", true),
            ("echo `bar` >> $GITHUB_ENV", true),
            (
                "echo \"PACKAGE_NAME=$(echo ${GITHUB_REF} | cut -d '/' -f 3 | cut -d '-' -f 1)\" >> ${GITHUB_ENV}",
                true,
            ),
            (
                "echo PACKAGE_NAME=\"$(echo ${GITHUB_REF} | cut -d '/' -f 3 | cut -d '-' -f 1)\" >> ${GITHUB_ENV}",
                true,
            ),
            ("unknown-command >> $GITHUB_ENV", true),
            ("unknown-command $foo >> $GITHUB_ENV", true),
            ("unknown-command 'some args' >> $GITHUB_ENV", true),
            ("echo $foo > $GITHUB_ENV", true),
            ("echo $foo > \"$GITHUB_ENV\"", true),
            ("echo $foo > ${GITHUB_ENV}", true),
            ("echo $foo > \"${GITHUB_ENV}\"", true),
            ("echo $foo>>$GITHUB_ENV", true),
            ("echo $foo>>\"$GITHUB_ENV\"", true),
            ("echo $foo>>${GITHUB_ENV}", true),
            ("echo $foo>>\"${GITHUB_ENV}\"", true),
            ("echo $foo >> \\\n $GITHUB_ENV", true),
            ("something | tee $GITHUB_ENV", true),
            ("something | tee $GITHUB_ENV | something-else", true),
            ("something | tee \"$GITHUB_ENV\"", true),
            ("something | tee ${GITHUB_ENV}", true),
            ("something | tee \"${GITHUB_ENV}\"", true),
            ("something|tee $GITHUB_ENV", true),
            ("something |tee $GITHUB_ENV", true),
            ("something| tee $GITHUB_ENV", true),
            ("echo $foo >> $OTHER_ENV # not $GITHUB_ENV", false),
            ("something | tee \"${$OTHER_ENV}\" # not $GITHUB_ENV", false),
            ("echo $foo >> GITHUB_ENV", false),
            ("echo $foo | tee GITHUB_ENV", false),
            ("echo $foo | tee $GITHUB", false),
            ("echo $foo | tee $GITHUB_", false),
            ("echo $foo | tee $GITHUB_ENVX", false),
            ("echo completely-static >> $GITHUB_ENV", false),
            ("echo 'completely-static' >> $GITHUB_ENV", false),
            ("echo 'completely-static' \"foo\" >> $GITHUB_ENV", false),
            ("echo \"completely-static\" >> $GITHUB_ENV", false),
        ] {
            let audit_state = AuditState::default();

            let sut = GitHubEnv::new(&audit_state).expect("failed to create audit");

            let uses_github_env = sut.uses_github_env(case, "bash").unwrap();

            assert!(uses_github_env.is_empty() != *expected, "failed: {case}");
        }
    }

    #[test]
    fn test_exploitable_cmd_patterns() {
        for (case, expected) in &[
            ("echo LIBRARY=%LIBRARY%>>%GITHUB_ENV%", true),
            ("echo LIBRARY=%LIBRARY%>> %GITHUB_ENV%", true),
            ("echo LIBRARY=%LIBRARY% >> %GITHUB_ENV%", true),
            ("echo LIBRARY=%LIBRARY% >> \"%GITHUB_ENV%\"", true),
            ("echo>>\"%GITHUB_ENV%\" %%a=%%b", true),
            (
                "echo SERVER=${{ secrets.SQL19SERVER }}>> %GITHUB_ENV%",
                true,
            ),
        ] {
            assert_eq!(GITHUB_ENV_WRITE_CMD.is_match(case), *expected);
        }
    }

    #[test]
    fn test_exploitable_pwsh_patterns() {
        for (case, expected) in &[
            ("foo >> ${env:GITHUB_ENV}", true),
            ("foo >> \"${env:GITHUB_ENV}\"", true),
            ("foo >> $env:GITHUB_ENV", true),
            ("foo >> \"$env:GITHUB_ENV\"", true),
            (
                "echo \"UV_CACHE_DIR=$UV_CACHE_DIR\" >> $env:GITHUB_ENV",
                true,
            ),
            ("foo > ${env:GITHUB_ENV}", true),
            ("foo > \"${env:GITHUB_ENV}\"", true),
            ("foo > $env:GITHUB_ENV", true),
            ("foo > \"$env:GITHUB_ENV\"", true),
            (
                "echo \"UV_CACHE_DIR=$UV_CACHE_DIR\" > $env:GITHUB_ENV",
                true,
            ),
            ("foo >> ${ENV:GITHUB_ENV}", true),
            ("foo >> ${ENV:github_env}", true),
            ("foo >> $ENV:GITHUB_ENV", true),
            ("foo >> $ENV:GitHub_Env", true),
            (
                "echo \"CUDA_PATH=$env:CUDA_PATH\" | Out-File -FilePath $env:GITHUB_ENV -Encoding utf8 -Append",
                true,
            ),
            (
                "\"PYTHON_BIN=$PYTHON_BIN\" | Out-File -FilePath $env:GITHUB_ENV -Append",
                true,
            ),
            (
                "echo \"SOLUTION_PATH=${slnPath}\" | Out-File $env:GITHUB_ENV -Encoding utf8 -Append",
                true,
            ),
            (
                "Add-Content -Path $env:GITHUB_ENV -Value \"RELEASE_VERSION=$releaseVersion\"",
                true,
            ),
            (
                "Add-Content $env:GITHUB_ENV \"DOTNET_ROOT=$Env:USERPROFILE\\.dotnet\"",
                true,
            ),
            (
                "Set-Content -Path $env:GITHUB_ENV -Value \"tag=$tag\"",
                true,
            ),
            (
                "[System.Text.Encoding]::UTF8.GetBytes(\"RELEASE_NOTES<<EOF`n$releaseNotes`nEOF\") |\nSet-Content -Path $Env:GITHUB_ENV -NoNewline -Encoding Byte",
                true,
            ),
            (
                "echo \"BRANCH=${{ env.BRANCH_NAME }}\" | Tee-Object -Append -FilePath \"${env:GITHUB_ENV}\"",
                true,
            ),
            (
                "echo \"JAVA_HOME=${Env:JAVA_HOME_11_X64}\" | Tee-Object -FilePath $env:GITHUB_ENV -Append",
                true,
            ),
            ("echo \"foo\" | out-file $Env:GitHub_Env -Append", true),
            ("echo \"foo\" | out-File $Env:GitHub_Env -Append", true),
            ("echo \"foo\" | OUT-FILE $Env:GitHub_Env -Append", true),
            ("foo >> $env:GITHUB_PATH", true),
            ("foo | Tee-Object -FilePath \"$env:GITHUB_PATH\"", true),
            ("foo >> <# destination #> $env:GITHUB_ENV", true),
            ("foo | Out-File `\n  -FilePath $env:GITHUB_ENV", true),
            ("Out-File -FilePath:$env:GITHUB_ENV", true),
            ("Out-File -FilePath:\"$env:GITHUB_ENV\"", true),
            ("Out-File $foo,$env:GITHUB_ENV", true),
            ("Out-File -FilePath:$foo,$env:GITHUB_ENV", true),
            ("foo >> bar # not $env:GITHUB_ENV", false),
            ("foo >> bar # not ${env:GITHUB_ENV}", false),
            (
                "echo \"foo\" | out-file bar -Append # not $env:GITHUB_ENV",
                false,
            ),
            ("foo >> GITHUB_ENV", false),
            ("foo >> $GITHUB_ENV", false),
            ("foo >> '$env:GITHUB_ENV'", false),
            ("Out-File -FilePath '$env:GITHUB_PATH'", false),
            ("Write-Host $env:GITHUB_ENV | Out-File other.txt", false),
            (
                "\"PYTHON_BIN=$PYTHON_BIN\" | Out-File -FilePath GITHUB_ENV -Append",
                false,
            ),
        ] {
            let audit_state = AuditState::default();

            let sut = GitHubEnv::new(&audit_state).expect("failed to create audit");

            let uses_github_env = sut.uses_github_env(case, "pwsh").unwrap();

            assert!(uses_github_env.is_empty() != *expected, "failed: {case}");
        }
    }
}
