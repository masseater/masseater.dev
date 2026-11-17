use github_actions_models::common::{Permission, Permissions};

use super::{Audit, AuditLoadError, Job, audit_meta};
use crate::features::audit_workflow::audit::AuditError;
use crate::features::audit_workflow::finding::location::Locatable as _;
use crate::features::audit_workflow::models::AsDocument as _;
use crate::features::audit_workflow::{
    AuditState,
    finding::{Confidence, Persona, Severity, location::SymbolicLocation},
};

audit_meta!(
    UndocumentedPermissions,
    "undocumented-permissions",
    "permissions without explanatory comments"
);

pub(crate) struct UndocumentedPermissions;

impl Audit for UndocumentedPermissions {
    fn new(_state: &AuditState) -> Result<Self, AuditLoadError>
    where
        Self: Sized,
    {
        Ok(Self)
    }

    fn audit_workflow<'doc>(
        &self,
        workflow: &'doc crate::features::audit_workflow::models::workflow::Workflow,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<crate::features::audit_workflow::finding::Finding<'doc>>, AuditError> {
        let mut findings = vec![];

        if let Some(finding) = Self::check_permissions_documentation(
            &workflow.permissions,
            &workflow.location(),
            workflow,
        )? {
            findings.push(finding);
        }

        for job in workflow.jobs() {
            let (permissions, job_location) = match job {
                Job::NormalJob(job) => (&job.permissions, job.location()),
                Job::ReusableWorkflowCallJob(job) => (&job.permissions, job.location()),
            };

            if let Some(finding) =
                Self::check_permissions_documentation(permissions, &job_location, workflow)?
            {
                findings.push(finding);
            }
        }

        Ok(findings)
    }
}

impl UndocumentedPermissions {
    fn check_permissions_documentation<'a>(
        permissions: &'a Permissions,
        location: &SymbolicLocation<'a>,
        workflow: &'a crate::features::audit_workflow::models::workflow::Workflow,
    ) -> Result<Option<crate::features::audit_workflow::finding::Finding<'a>>, AuditError> {
        let Permissions::Explicit(perms) = permissions else {
            return Ok(None);
        };

        if perms.is_empty() {
            return Ok(None);
        }

        let mut finding_builder = Self::finding()
            .severity(Severity::Low)
            .confidence(Confidence::High)
            .persona(Persona::Pedantic);

        let base_location = location.clone().primary();
        let mut has_undocumented = false;

        for (perm_name, perm) in perms {
            if perm_name == "contents" && *perm == Permission::Read {
                continue;
            }

            let individual_perm_location = base_location
                .clone()
                .with_keys(["permissions".into(), perm_name.as_str().into()]);

            if !Self::has_explanatory_comment(&individual_perm_location, workflow)? {
                finding_builder = finding_builder.add_location(
                    individual_perm_location.annotated("needs an explanatory comment"),
                );
                has_undocumented = true;
            }
        }

        if has_undocumented {
            Ok(Some(finding_builder.build(workflow)?))
        } else {
            Ok(None)
        }
    }

    fn has_explanatory_comment(
        location: &SymbolicLocation,
        workflow: &crate::features::audit_workflow::models::workflow::Workflow,
    ) -> Result<bool, AuditError> {
        let document = workflow.as_document();

        let concrete_location = location.clone().concretize(document).map_err(Self::err)?;

        Ok(concrete_location
            .concrete
            .comments
            .iter()
            .any(super::super::finding::location::Comment::is_meaningful))
    }
}
