use serde_json::json;

use super::finding::Persona;
use super::github::{
    Client,
    mock::{Route, serve},
};
use super::state::AuditState;
use super::{AuditFile, AuditOptions, audit_in};

const TAGGED: &str = "1111111111111111111111111111111111111111";
const BRANCH_HEAD: &str = "2222222222222222222222222222222222222222";
const ORPHAN: &str = "3333333333333333333333333333333333333333";
const OTHER_TAG: &str = "4444444444444444444444444444444444444444";
const ADVISORY: &str = "GHSA-aaaa-bbbb-cccc";

fn workflow(uses: &str) -> String {
    format!(
        "name: ci\non: push\npermissions: {{}}\njobs:\n  test:\n    name: test\n    runs-on: ubuntu-latest\n    steps:\n      - uses: {uses}\n"
    )
}

fn checkout_refs(extra: &[(&str, &str)]) -> Route {
    let mut refs = vec![
        (TAGGED, "refs/tags/v4.2.0"),
        (TAGGED, "refs/tags/v4"),
        (BRANCH_HEAD, "refs/heads/main"),
    ];
    refs.extend_from_slice(extra);
    Route::refs("actions/checkout", &refs)
}

fn messages(uses: &str, routes: Vec<Route>, options: &AuditOptions) -> Vec<(String, String)> {
    let base = serve(routes);
    let state = AuditState::online(Client::local(&base));
    let reports = audit_in(
        &state,
        "/repo",
        vec![AuditFile {
            path: ".github/workflows/ci.yml".to_owned(),
            text: workflow(uses),
        }],
        options,
    )
    .expect("audits run");
    reports
        .into_iter()
        .flat_map(|report| report.diagnostics)
        .map(|diagnostic| (diagnostic.kind.clone(), diagnostic.message))
        .collect()
}

fn kinds(found: &[(String, String)]) -> Vec<&str> {
    found.iter().map(|(kind, _)| kind.as_str()).collect()
}

fn auditor() -> AuditOptions {
    AuditOptions {
        persona: Persona::Auditor,
        ..AuditOptions::default()
    }
}

#[test]
fn flags_a_ref_that_names_both_a_branch_and_a_tag() {
    let found = messages(
        "actions/checkout@v4",
        vec![checkout_refs(&[(BRANCH_HEAD, "refs/heads/v4")])],
        &AuditOptions::default(),
    );
    assert!(kinds(&found).contains(&"ref-confusion"), "{found:?}");
}

#[test]
fn passes_a_ref_that_names_only_a_tag() {
    let found = messages(
        "actions/checkout@v4",
        vec![checkout_refs(&[])],
        &AuditOptions::default(),
    );
    assert!(!kinds(&found).contains(&"ref-confusion"), "{found:?}");
}

#[test]
fn flags_a_commit_that_no_branch_or_tag_contains() {
    let found = messages(
        &format!("actions/checkout@{ORPHAN}"),
        vec![
            checkout_refs(&[]),
            Route::json(
                format!("/actions/checkout/branch_commits/{ORPHAN}"),
                &json!({ "branches": [], "tags": [] }),
            ),
        ],
        &AuditOptions::default(),
    );
    assert!(kinds(&found).contains(&"impostor-commit"), "{found:?}");
}

#[test]
fn passes_a_commit_that_a_tag_points_to() {
    let found = messages(
        &format!("actions/checkout@{TAGGED} # v4.2.0"),
        vec![checkout_refs(&[])],
        &auditor(),
    );
    let kinds = kinds(&found);
    assert!(!kinds.contains(&"impostor-commit"), "{found:?}");
    assert!(!kinds.contains(&"stale-action-refs"), "{found:?}");
    assert!(!kinds.contains(&"ref-version-mismatch"), "{found:?}");
}

#[test]
fn flags_a_pinned_commit_that_no_tag_points_to() {
    let found = messages(
        &format!("actions/checkout@{BRANCH_HEAD}"),
        vec![checkout_refs(&[])],
        &auditor(),
    );
    let kinds = kinds(&found);
    assert!(kinds.contains(&"stale-action-refs"), "{found:?}");
    assert!(!kinds.contains(&"impostor-commit"), "{found:?}");
}

#[test]
fn flags_a_version_comment_that_points_elsewhere() {
    let found = messages(
        &format!("actions/checkout@{TAGGED} # v5.0.0"),
        vec![checkout_refs(&[(OTHER_TAG, "refs/tags/v5.0.0")])],
        &AuditOptions::default(),
    );
    let mismatch = found
        .iter()
        .find(|(kind, _)| kind == "ref-version-mismatch")
        .unwrap_or_else(|| panic!("{found:?}"));
    assert!(
        mismatch.1.contains("tag points to commit 444444444444"),
        "{mismatch:?}"
    );
}

#[test]
fn flags_an_action_version_with_a_known_advisory() {
    let routes = || {
        vec![
            checkout_refs(&[]),
            Route::json(
                "/advisories",
                &json!([{ "ghsa_id": ADVISORY, "severity": "medium" }]),
            ),
        ]
    };
    let found = messages("actions/checkout@v4", routes(), &AuditOptions::default());
    let vulnerable = found
        .iter()
        .find(|(kind, _)| kind == "known-vulnerable-actions")
        .unwrap_or_else(|| panic!("{found:?}"));
    assert!(vulnerable.1.contains(ADVISORY), "{vulnerable:?}");
    assert!(
        vulnerable
            .1
            .contains(&format!("https://github.com/advisories/{ADVISORY}")),
        "{vulnerable:?}"
    );

    let allowed = AuditOptions {
        rules: Some(json!({ "known-vulnerable-actions": { "config": { "allow": [ADVISORY] } } })),
        ..AuditOptions::default()
    };
    let found = messages("actions/checkout@v4", routes(), &allowed);
    assert!(
        !kinds(&found).contains(&"known-vulnerable-actions"),
        "{found:?}"
    );
}

#[test]
fn keeps_offline_audits_when_github_is_unreachable() {
    let found = messages(
        "actions/checkout@v4",
        vec![Route::missing(
            "POST",
            "/actions/checkout.git/git-upload-pack",
        )],
        &AuditOptions::default(),
    );
    assert!(kinds(&found).contains(&"unpinned-uses"), "{found:?}");
}
