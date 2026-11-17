use anyhow::anyhow;
use github_actions_models::common::{RepositoryUses, Uses};
use subfeature::Subfeature;

use crate::features::audit_workflow::{
    audit::{Audit, AuditError, AuditLoadError, AuditState, audit_meta},
    finding::{
        Confidence, Finding, Persona, Severity,
        location::{Comment, Feature, Locatable, Location},
    },
    github,
    models::{
        AsDocument, StepCommon,
        action::CompositeStep,
        uses::RepositoryUsesExt as _,
        version::RawVersion,
        workflow::{ReusableWorkflowCallJob, Step},
    },
};

pub(crate) struct RefVersionMismatch {
    client: github::Client,
}

audit_meta!(
    RefVersionMismatch,
    "ref-version-mismatch",
    "action's hash pin has mismatched or missing version comment"
);

#[derive(Debug)]
enum VersionCommentState<'doc> {
    Missing,

    Version {
        version: &'doc str,
        comment: &'doc Comment<'doc>,
    },

    NonVersionComments,
}

impl RefVersionMismatch {
    fn extract_version_from_comments<'doc>(
        comments: &'doc [Comment<'doc>],
    ) -> Option<(&'doc str, &'doc Comment<'doc>)> {
        for comment in comments {
            if let Some(version) = RawVersion::from_comment(comment) {
                return Some((version.as_raw(), comment));
            }
        }
        None
    }

    fn detect_version_comment<'doc>(comments: &'doc [Comment<'doc>]) -> VersionCommentState<'doc> {
        match Self::extract_version_from_comments(comments) {
            Some((version, comment)) => VersionCommentState::Version { version, comment },
            None if comments.is_empty() => VersionCommentState::Missing,
            None => VersionCommentState::NonVersionComments,
        }
    }

    fn process_uses<'a, 'doc, S>(
        &self,
        uses: &'doc RepositoryUses,
        parent: &'a S,
    ) -> Result<Option<Finding<'doc>>, AuditError>
    where
        S: Locatable<'doc> + AsDocument<'a, 'doc>,
    {
        let Some(commit_sha) = uses.commit_ref() else {
            return Ok(None);
        };

        let parent_location = parent.location();
        let uses_location = parent_location
            .with_keys(["uses".into()])
            .concretize(parent.as_document())
            .map_err(Self::err)?;

        let comment_version_state = Self::detect_version_comment(&uses_location.concrete.comments);

        let (version, comment) = match comment_version_state {
            VersionCommentState::Version { version, comment } => (version, comment),
            VersionCommentState::Missing | VersionCommentState::NonVersionComments => {
                let Some(tag) = self
                    .client
                    .longest_tag_for_commit(&uses.into(), uses.subpath(), commit_sha)
                    .map_err(Self::err)?
                else {
                    return Ok(None);
                };

                let (annotation, tip) = match comment_version_state {
                    VersionCommentState::Missing => (
                        "missing version comment",
                        format!("add version comment '# {}'", tag.name),
                    ),
                    VersionCommentState::NonVersionComments => (
                        "comment does not contain a version",
                        format!("rewrite comment to include '# {}'", tag.name),
                    ),
                    VersionCommentState::Version { .. } => unreachable!(),
                };

                let builder = Self::finding()
                    .severity(Severity::Low)
                    .confidence(Confidence::High)
                    .persona(Persona::Pedantic)
                    .add_location(parent_location.hidden())
                    .add_location(
                        uses_location
                            .symbolic
                            .primary()
                            .subfeature(Subfeature::new(0, uses.raw()))
                            .annotated(annotation),
                    )
                    .tip(tip);

                return Ok(Some(builder.build(parent).map_err(Self::err)?));
            }
        };

        let git_ref = self
            .client
            .lookup_ref(&uses.into(), version)
            .map_err(Self::err)?;

        if git_ref.as_ref().map(super::super::github::Ref::commit) == Some(commit_sha) {
            return Ok(None);
        }

        let subfeature = Subfeature::new(comment.location().offset_span.start, version);

        let comment_location = match git_ref {
            Some(commit_for_ref) => Location::new(
                uses_location.symbolic.clone().primary().annotated(format!(
                    "{kind} points to commit {short_commit}",
                    kind = commit_for_ref.kind(),
                    short_commit = &commit_for_ref.commit()[..12]
                )),
                Feature::from_subfeature(&subfeature, parent),
            ),
            None => Location::new(
                uses_location
                    .symbolic
                    .clone()
                    .primary()
                    .annotated("points to unknown ref"),
                Feature::from_subfeature(&subfeature, parent),
            ),
        };

        let mut builder = Self::finding()
            .severity(Severity::Medium)
            .confidence(Confidence::High)
            .add_location(parent.location().hidden())
            .add_raw_location(comment_location);

        if let Some(suggestion) = self
            .client
            .longest_tag_for_commit(&uses.into(), uses.subpath(), commit_sha)
            .map_err(Self::err)?
        {
            builder = builder.add_location(parent_location.hidden()).add_location(
                uses_location
                    .symbolic
                    .subfeature(Subfeature::new(0, uses.raw()))
                    .annotated(format!("is pointed to by tag {tag}", tag = suggestion.name)),
            );
        }

        Ok(Some(builder.build(parent).map_err(Self::err)?))
    }

    fn process_step<'doc, S: StepCommon<'doc>>(
        &self,
        step: &S,
    ) -> Result<Option<Finding<'doc>>, AuditError> {
        let Some(Uses::Repository(uses)) = step.uses() else {
            return Ok(None);
        };

        self.process_uses(uses, step)
    }
}

impl Audit for RefVersionMismatch {
    fn new(state: &AuditState) -> Result<Self, AuditLoadError> {
        if state.no_online_audits {
            return Err(AuditLoadError::Skip(anyhow!(
                "offline audits only requested"
            )));
        }

        state
            .gh_client
            .clone()
            .ok_or_else(|| AuditLoadError::Skip(anyhow!("can't run without a GitHub API token")))
            .map(|client| Self { client })
    }

    fn audit_step<'doc>(
        &self,
        step: &Step<'doc>,
        group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        if let Some(lock) = group.lock()
            && lock.is_locked(step)
        {
            return Ok(vec![]);
        }

        Ok(self.process_step(step)?.into_iter().collect())
    }

    fn audit_composite_step<'doc>(
        &self,
        step: &CompositeStep<'doc>,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        Ok(self.process_step(step)?.into_iter().collect())
    }

    fn audit_reusable_job<'doc>(
        &self,
        job: &ReusableWorkflowCallJob<'doc>,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        let Uses::Repository(uses) = &job.uses else {
            return Ok(vec![]);
        };

        Ok(self.process_uses(uses, job)?.into_iter().collect())
    }
}

#[cfg(test)]
mod tests {
    use std::assert_matches;

    use super::*;
    use crate::features::audit_workflow::{models::action::Action, registry::input::InputKey};

    #[test]
    fn test_comment_version_state_with_unrelated_comment() {
        let action_content = r"
name: Test Missing Version Comment
description: Test Missing Version Comment
runs:
  using: composite
  steps:
    - name: Checkout with unrelated comment
      uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # some comment
";

        let key = InputKey::local("action.yml", None);
        let action = Action::from_string(action_content, key).unwrap();
        let step = action.steps().unwrap().next().unwrap();
        let uses_location = step
            .location()
            .with_keys(["uses".into()])
            .concretize(step.document())
            .unwrap();

        assert_matches!(
            RefVersionMismatch::detect_version_comment(&uses_location.concrete.comments),
            VersionCommentState::NonVersionComments,
        );
    }
}
