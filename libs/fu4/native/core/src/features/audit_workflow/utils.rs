use camino::Utf8Path;
use github_actions_expressions::context::{Context, ContextPattern};
use github_actions_models::common::{Env, expr::LoE};
use std::ops::{Deref, Range};
use std::sync::LazyLock;

use crate::features::audit_workflow::finding::location::Routable;
use crate::features::audit_workflow::models::AsDocument;

pub(crate) static ZIZMOR_AGENT: &str = concat!("zizmor/", env!("CARGO_PKG_VERSION"));

pub(crate) static BASH: LazyLock<tree_sitter::Language> =
    LazyLock::new(|| tree_sitter_bash::LANGUAGE.into());

pub(crate) static PWSH: LazyLock<tree_sitter::Language> =
    LazyLock::new(|| tree_sitter_powershell::LANGUAGE.into());

macro_rules! pat {
    ($pat:expr) => {
        ContextPattern::new($pat)
    };
}

pub(crate) static DEFAULT_ENVIRONMENT_VARIABLES: &[(
    &str,
    ContextPattern,
    Option<ContextPattern>,
    bool,
)] = &[
    ("CI", pat!("env.CI"), None, false),
    (
        "GITHUB_ACTION",
        pat!("env.GITHUB_ACTION"),
        Some(pat!("github.action")),
        true,
    ),
    (
        "GITHUB_ACTION_PATH",
        pat!("env.GITHUB_ACTION_PATH"),
        Some(pat!("github.action_path")),
        true,
    ),
    (
        "GITHUB_ACTION_REPOSITORY",
        pat!("env.GITHUB_ACTION_REPOSITORY"),
        Some(pat!("github.action_repository")),
        true,
    ),
    ("GITHUB_ACTIONS", pat!("env.GITHUB_ACTIONS"), None, true),
    (
        "GITHUB_ACTOR",
        pat!("env.GITHUB_ACTOR"),
        Some(pat!("github.actor")),
        true,
    ),
    (
        "GITHUB_ACTOR_ID",
        pat!("env.GITHUB_ACTOR_ID"),
        Some(pat!("github.actor_id")),
        true,
    ),
    (
        "GITHUB_API_URL",
        pat!("env.GITHUB_API_URL"),
        Some(pat!("github.api_url")),
        true,
    ),
    (
        "GITHUB_BASE_REF",
        pat!("env.GITHUB_BASE_REF"),
        Some(pat!("github.base_ref")),
        true,
    ),
    (
        "GITHUB_ENV",
        pat!("env.GITHUB_ENV"),
        Some(pat!("github.env")),
        true,
    ),
    (
        "GITHUB_EVENT_NAME",
        pat!("env.GITHUB_EVENT_NAME"),
        Some(pat!("github.event_name")),
        true,
    ),
    (
        "GITHUB_EVENT_PATH",
        pat!("env.GITHUB_EVENT_PATH"),
        Some(pat!("github.event_path")),
        true,
    ),
    (
        "GITHUB_GRAPHQL_URL",
        pat!("env.GITHUB_GRAPHQL_URL"),
        Some(pat!("github.graphql_url")),
        true,
    ),
    (
        "GITHUB_HEAD_REF",
        pat!("env.GITHUB_HEAD_REF"),
        Some(pat!("github.head_ref")),
        true,
    ),
    (
        "GITHUB_JOB",
        pat!("env.GITHUB_JOB"),
        Some(pat!("github.job")),
        true,
    ),
    ("GITHUB_OUTPUT", pat!("env.GITHUB_OUTPUT"), None, true),
    (
        "GITHUB_PATH",
        pat!("env.GITHUB_PATH"),
        Some(pat!("github.path")),
        true,
    ),
    (
        "GITHUB_REF",
        pat!("env.GITHUB_REF"),
        Some(pat!("github.ref")),
        true,
    ),
    (
        "GITHUB_REF_NAME",
        pat!("env.GITHUB_REF_NAME"),
        Some(pat!("github.ref_name")),
        true,
    ),
    (
        "GITHUB_REF_PROTECTED",
        pat!("env.GITHUB_REF_PROTECTED"),
        Some(pat!("github.ref_protected")),
        true,
    ),
    (
        "GITHUB_REF_TYPE",
        pat!("env.GITHUB_REF_TYPE"),
        Some(pat!("github.ref_type")),
        true,
    ),
    (
        "GITHUB_REPOSITORY",
        pat!("env.GITHUB_REPOSITORY"),
        Some(pat!("github.repository")),
        true,
    ),
    (
        "GITHUB_REPOSITORY_ID",
        pat!("env.GITHUB_REPOSITORY_ID"),
        Some(pat!("github.repository_id")),
        true,
    ),
    (
        "GITHUB_REPOSITORY_OWNER",
        pat!("env.GITHUB_REPOSITORY_OWNER"),
        Some(pat!("github.repository_owner")),
        true,
    ),
    (
        "GITHUB_REPOSITORY_OWNER_ID",
        pat!("env.GITHUB_REPOSITORY_OWNER_ID"),
        Some(pat!("github.repository_owner_id")),
        true,
    ),
    (
        "GITHUB_RUN_ATTEMPT",
        pat!("env.GITHUB_RUN_ATTEMPT"),
        Some(pat!("github.run_attempt")),
        true,
    ),
    (
        "GITHUB_RUN_ID",
        pat!("env.GITHUB_RUN_ID"),
        Some(pat!("github.run_id")),
        true,
    ),
    (
        "GITHUB_RUN_NUMBER",
        pat!("env.GITHUB_RUN_NUMBER"),
        Some(pat!("github.run_number")),
        true,
    ),
    (
        "GITHUB_SERVER_URL",
        pat!("env.GITHUB_SERVER_URL"),
        Some(pat!("github.server_url")),
        true,
    ),
    (
        "GITHUB_SHA",
        pat!("env.GITHUB_SHA"),
        Some(pat!("github.sha")),
        true,
    ),
    (
        "GITHUB_TRIGGERING_ACTOR",
        pat!("env.GITHUB_TRIGGERING_ACTOR"),
        Some(pat!("github.triggering_actor")),
        true,
    ),
    (
        "GITHUB_WORKFLOW",
        pat!("env.GITHUB_WORKFLOW"),
        Some(pat!("github.workflow")),
        true,
    ),
    (
        "GITHUB_WORKFLOW_REF",
        pat!("env.GITHUB_WORKFLOW_REF"),
        Some(pat!("github.workflow_ref")),
        true,
    ),
    (
        "GITHUB_WORKFLOW_SHA",
        pat!("env.GITHUB_WORKFLOW_SHA"),
        Some(pat!("github.workflow_sha")),
        true,
    ),
    (
        "GITHUB_WORKSPACE",
        pat!("env.GITHUB_WORKSPACE"),
        Some(pat!("github.workspace")),
        true,
    ),
    (
        "RUNNER_ARCH",
        pat!("env.RUNNER_ARCH"),
        Some(pat!("runner.arch")),
        true,
    ),
    (
        "RUNNER_DEBUG",
        pat!("env.RUNNER_DEBUG"),
        Some(pat!("runner.debug")),
        true,
    ),
    (
        "RUNNER_ENVIRONMENT",
        pat!("env.RUNNER_ENVIRONMENT"),
        Some(pat!("runner.environment")),
        true,
    ),
    (
        "RUNNER_NAME",
        pat!("env.RUNNER_NAME"),
        Some(pat!("runner.name")),
        true,
    ),
    (
        "RUNNER_OS",
        pat!("env.RUNNER_OS"),
        Some(pat!("runner.os")),
        true,
    ),
    (
        "RUNNER_TEMP",
        pat!("env.RUNNER_TEMP"),
        Some(pat!("runner.temp")),
        true,
    ),
    (
        "RUNNER_TOOL_CACHE",
        pat!("env.RUNNER_TOOL_CACHE"),
        Some(pat!("runner.tool_cache")),
        true,
    ),
];

pub(crate) fn split_patterns(patterns: &str) -> impl Iterator<Item = &str> {
    patterns
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty() && !line.starts_with('#'))
}

pub(crate) struct ExtractedExpr<'a> {
    inner: &'a str,
    fenced: bool,
}

impl<'a> ExtractedExpr<'a> {
    pub(crate) fn new(expr: &'a str) -> Self {
        Self::from_fenced(expr).unwrap_or_else(|| Self::from_bare(expr))
    }

    pub(crate) fn from_fenced(expr: &'a str) -> Option<Self> {
        expr.strip_prefix("${{")
            .and_then(|e| e.strip_suffix("}}"))
            .map(|_| ExtractedExpr {
                inner: expr,
                fenced: true,
            })
    }

    fn from_bare(expr: &'a str) -> Self {
        ExtractedExpr {
            inner: expr,
            fenced: false,
        }
    }

    pub(crate) fn as_bare(&self) -> &'a str {
        if self.fenced {
            self.inner
                .strip_prefix("${{")
                .and_then(|e| e.strip_suffix("}}"))
                .expect("invariant violated: not a fenced expression")
        } else {
            self.inner
        }
    }

    pub(crate) fn as_raw(&self) -> &'a str {
        self.inner
    }
}

pub(crate) fn extract_fenced_expression(
    text: &str,
    offset: usize,
) -> Option<(ExtractedExpr<'_>, Range<usize>)> {
    let view = &text[offset..];
    let start = view.find("${{")?;

    let mut end = None;
    let mut in_string = false;

    for (idx, char) in view.bytes().enumerate().skip(start) {
        if char == b'\'' {
            in_string = !in_string;
        } else if !in_string && view.as_bytes()[idx] == b'}' && view.as_bytes()[idx - 1] == b'}' {
            end = Some(idx);
            break;
        }
    }

    end.map(|end| {
        (
            ExtractedExpr::from_fenced(&view[start..=end]).expect("impossible"),
            start + offset..end + offset + 1,
        )
    })
}

pub(crate) fn extract_fenced_expressions(text: &str) -> Vec<(ExtractedExpr<'_>, Range<usize>)> {
    let mut exprs = vec![];
    let mut offset = 0;

    while let Some((expr, span)) = extract_fenced_expression(text, offset) {
        exprs.push((expr, (span.start..span.end)));

        if span.end >= text.len() {
            break;
        }
        offset = span.end;
    }

    exprs
}

pub(crate) fn parse_fenced_expressions_from_routable<
    'a,
    'doc,
    R: AsDocument<'a, 'doc> + Routable<'a, 'doc>,
>(
    input: &'a R,
) -> Vec<(ExtractedExpr<'doc>, Range<usize>)> {
    let doc = input.as_document();

    let (content, feature) = {
        let feature = doc
            .query_pretty(&input.route())
            .expect("invalid route when extracting fenced expressions");
        (doc.extract(&feature), feature)
    };

    let mut exprs = vec![];
    let bias = feature.location.byte_span.0;
    let mut offset = 0;

    while let Some((expr, span)) = extract_fenced_expression(content, offset) {
        if doc.offset_inside_comment(span.start + bias) {
            offset = span.start + 1;
            continue;
        }

        exprs.push((expr, (span.start + bias..span.end + bias)));

        if span.end >= feature.location.byte_span.1 {
            break;
        }
        offset = span.end;
    }

    exprs
}

pub(crate) fn env_is_static(env_ctx: &Context, envs: &[&LoE<Env>]) -> bool {
    for (_, env_ctx_pat, _, is_static) in DEFAULT_ENVIRONMENT_VARIABLES {
        if env_ctx_pat.matches(env_ctx) {
            return *is_static;
        }
    }

    let Some(env_name) = env_ctx.single_tail() else {
        return false;
    };

    for env in envs {
        match env {
            LoE::Expr(_) => return false,
            LoE::Literal(env) => {
                let Some(value) = env.get(env_name) else {
                    continue;
                };

                return extract_fenced_expressions(&value.to_string()).is_empty();
            }
        }
    }

    false
}

pub(crate) fn normalize_shell(shell: &str) -> &str {
    let path = match shell.split_once(' ') {
        Some((path, _)) => path,
        None => shell,
    };

    Utf8Path::new(path).file_name().unwrap_or(path)
}

pub(crate) struct SpannedQuery {
    inner: tree_sitter::Query,
    pub(crate) span_idx: u32,
}

impl Deref for SpannedQuery {
    type Target = tree_sitter::Query;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

pub(crate) fn bash_parser() -> tree_sitter::Parser {
    let mut parser = tree_sitter::Parser::new();
    parser
        .set_language(&BASH)
        .expect("internal error: failed to set bash language");
    parser
}

pub(crate) fn pwsh_parser() -> tree_sitter::Parser {
    let mut parser = tree_sitter::Parser::new();
    parser
        .set_language(&PWSH)
        .expect("internal error: failed to set powershell language");
    parser
}

impl SpannedQuery {
    pub(crate) fn new(query: &'static str, language: &tree_sitter::Language) -> Self {
        let query = tree_sitter::Query::new(language, query).expect("malformed query");
        let span_idx = query
            .capture_index_for_name("span")
            .expect("internal error: missing @span capture");

        Self {
            inner: query,
            span_idx,
        }
    }
}

pub(crate) mod once {
    macro_rules! once {
        ($expression:expr) => {{
            static ONCE: std::sync::Once = std::sync::Once::new();
            ONCE.call_once(|| {
                $expression;
            });
        }};
    }

    macro_rules! warn_once {
        ($($arg:tt)+) => ({
            crate::features::audit_workflow::utils::once::once!(tracing::warn!($($arg)+))
        });
    }

    macro_rules! static_regex {
        ($ident:ident, $pattern:literal) => {
            static $ident: std::sync::LazyLock<regex::Regex> = std::sync::LazyLock::new(|| {
                regex::Regex::new($pattern).expect(concat!(
                    "internal error: invalid regex pattern for ",
                    stringify!($ident)
                ))
            });
        };
    }

    pub(crate) use once;
    pub(crate) use static_regex;
    pub(crate) use warn_once;
}

#[cfg(test)]
mod tests {
    use anyhow::Result;
    use github_actions_expressions::Expr;

    use crate::features::audit_workflow::{
        audit::AuditInput,
        models::{action::Action, workflow::Workflow},
        registry::input::InputKey,
        utils::{
            env_is_static, extract_fenced_expression, extract_fenced_expressions, normalize_shell,
            parse_fenced_expressions_from_routable,
        },
    };

    #[test]
    fn split_patterns() {
        let patterns = "
        foo
        bar
        ${{ baz }}
        internal  spaces
        **
        *
        # comment
        ## more hashes
        # internal # hashes

        # another comment
        foo/*.txt
        ";

        let pats = super::split_patterns(patterns).collect::<Vec<_>>();
        assert_eq!(
            pats,
            &[
                "foo",
                "bar",
                "${{ baz }}",
                "internal  spaces",
                "**",
                "*",
                "foo/*.txt"
            ]
        );
    }

    #[test]
    fn test_extract_fenced_expression() {
        let exprs = &[
            ("${{ foo }}", " foo ", 0..10),
            ("${{ foo }}${{ bar }}", " foo ", 0..10),
            ("leading ${{ foo }} trailing", " foo ", 8..18),
            (
                "leading ${{ '${{ quoted! }}' }} trailing",
                " '${{ quoted! }}' ",
                8..31,
            ),
            ("${{ 'es''cape' }}", " 'es''cape' ", 0..17),
        ];

        for (text, expected_expr, expected_span) in exprs {
            let (actual_expr, actual_span) = extract_fenced_expression(text, 0).unwrap();
            assert_eq!(*expected_expr, actual_expr.as_bare());
            assert_eq!(*expected_span, actual_span);
        }
    }

    #[test]
    fn test_extract_fenced_expressions() {
        let multiple = r#"echo "OSSL_PATH=${{ github.workspace }}/osslcache/${{ matrix.PYTHON.OPENSSL.TYPE }}-${{ matrix.PYTHON.OPENSSL.VERSION }}-${OPENSSL_HASH}" >> $GITHUB_ENV"#;

        {
            let (raw, expected) = &(
                multiple,
                [
                    "${{ github.workspace }}",
                    "${{ matrix.PYTHON.OPENSSL.TYPE }}",
                    "${{ matrix.PYTHON.OPENSSL.VERSION }}",
                ]
                .as_slice(),
            );
            let exprs = extract_fenced_expressions(raw)
                .into_iter()
                .map(|(e, _)| e.as_raw().to_string())
                .collect::<Vec<_>>();

            assert_eq!(exprs, *expected);
        }
    }

    #[test]
    fn test_extract_fenced_expressions_from_routable() -> Result<()> {
        let action = r"
name: >-  # ${{ '' } is a hack to nest jobs under the same sidebar category
  Windows MSI${{ '' }}

description: test

runs:
  using: composite
  steps:
    - name: foo
      run: echo hello
      shell: bash
";

        let action = AuditInput::from(Action::from_string(action, InputKey::local("fake", None))?);

        let exprs = parse_fenced_expressions_from_routable(&action);
        assert_eq!(exprs.len(), 1);
        assert_eq!(exprs[0].0.as_raw().to_string(), "${{ '' }}");

        let workflow = r"
# ${{ 'don''t parse me' }}

# Observe that the expression in the comment below is invalid:
# it's missing a closing brace. This should not interfere with
# parsing the rest of the file's expressions
name: >- # ${{ 'oops' }
  custom-name-${{ github.sha }}

on:
  push:

permissions: {}

jobs:
  whops:
    runs-on: ubuntu-latest

    steps:
      - run: echo hello from ${{ github.actor }}
";

        let workflow = AuditInput::from(Workflow::from_string(
            workflow,
            InputKey::local("fake", None),
        )?);

        let exprs = parse_fenced_expressions_from_routable(&workflow)
            .into_iter()
            .map(|(e, _)| e.as_raw().to_string())
            .collect::<Vec<_>>();

        assert_eq!(exprs, &["${{ github.sha }}", "${{ github.actor }}",]);

        Ok(())
    }

    #[test]
    fn test_extract_fenced_expressions_from_routable_spans() -> Result<()> {
        let workflow_content = r#"
name: Test Workflow
on: push

permissions: {}

jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2
        with:
          fetch-depth: 0 # ... because release-please scans historical commits to build releases, so we need all the history.
          persist-credentials: false
      - id: release
        uses: ./vendor/github.com/googleapis/release-please-action
        with:
          config-file: "tools/releasing/config.release-please.json"
          manifest-file: "tools/releasing/manifest.release-please.json"
          target-branch: "${{ inputs.rp_target_branch }}"
    outputs:
      iac/terraform/attribution.tfm--release_created: ${{ 'steps.release.outputs.iac/terraform/attribution.tfm--release_created' }}
"#;

        let workflow = AuditInput::from(Workflow::from_string(
            workflow_content,
            InputKey::local("fake", None),
        )?);
        let exprs = parse_fenced_expressions_from_routable(&workflow)
            .into_iter()
            .map(|(e, span)| (e.as_raw().to_string(), span))
            .collect::<Vec<_>>();

        assert_eq!(exprs.len(), 2);
        assert_eq!(exprs[0].0, "${{ inputs.rp_target_branch }}");
        assert_eq!(exprs[0].1, 635..665);
        assert_eq!(
            &workflow_content[exprs[0].1.clone()],
            "${{ inputs.rp_target_branch }}"
        );
        assert_eq!(
            exprs[1].0,
            "${{ 'steps.release.outputs.iac/terraform/attribution.tfm--release_created' }}"
        );
        assert_eq!(exprs[1].1, 734..811);
        assert_eq!(
            &workflow_content[exprs[1].1.clone()],
            "${{ 'steps.release.outputs.iac/terraform/attribution.tfm--release_created' }}"
        );

        Ok(())
    }

    #[test]
    fn test_normalize_shell() {
        for (actual, expected) in &[
            ("bash", "bash"),
            ("/bin/bash", "bash"),
            ("/bash", "bash"),
            ("./bash", "bash"),
            ("../bash", "bash"),
            ("/./../bash", "bash"),
            ("/bin/bash -e {0}", "bash"),
        ] {
            assert_eq!(normalize_shell(actual), *expected);
        }
    }

    #[test]
    fn test_env_is_static_default() {
        for (env_ctx, is_static) in &[
            ("env.CI", false),
            ("env.GITHUB_ACTION", true),
            ("env['GITHUB_ACTION']", true),
            ("env.GITHUB_ACTIONS", true),
            ("env.RUNNER_OS", true),
            ("env.runner_os", true),
            ("env['runner_os']", true),
            ("env.UNKNOWN", false),
            ("env['UNKNOWN']", false),
        ] {
            let Expr::Context(ctx) = &*Expr::parse(env_ctx).unwrap() else {
                panic!("expected a context expression for {env_ctx}");
            };

            assert_eq!(env_is_static(ctx, &[]), *is_static, "for {env_ctx}");
        }
    }
}
