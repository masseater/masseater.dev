use crate::features::audit_workflow::{
    audit::{Audit, AuditError, audit_meta},
    finding::{Confidence, Severity, location::Locatable as _},
    models::dependabot,
};

audit_meta!(
    DependabotCooldown,
    "dependabot-cooldown",
    "insufficient cooldown in Dependabot updates"
);

pub(crate) struct DependabotCooldown;

impl DependabotCooldown {}

impl Audit for DependabotCooldown {
    fn new(
        _state: &crate::features::audit_workflow::state::AuditState,
    ) -> Result<Self, super::AuditLoadError>
    where
        Self: Sized,
    {
        Ok(Self)
    }

    fn audit_dependabot<'doc>(
        &self,
        dependabot: &'doc dependabot::Dependabot,
        group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<crate::features::audit_workflow::finding::Finding<'doc>>, AuditError> {
        let mut findings = vec![];

        let minimum_days = group.config().dependabot_cooldown.days.get() as u64;

        for update in dependabot.updates() {
            let default_days = update
                .cooldown
                .as_ref()
                .map_or(3, |cooldown| cooldown.default_days.unwrap_or(3));

            if default_days >= minimum_days {
                return Ok(findings);
            }

            let location = match update.cooldown.as_ref() {
                Some(cooldown) => match cooldown.default_days {
                    Some(_) => update
                        .location()
                        .with_keys(["cooldown".into(), "default-days".into()])
                        .primary()
                        .annotated(format!(
                            "insufficient default-days configured (less than {minimum_days})",
                        )),

                    None => update
                        .location()
                        .with_keys(["cooldown".into()])
                        .primary()
                        .annotated(format!(
                            "insufficient implicit default-days (less than {minimum_days})"
                        )),
                },

                None => update.location_with_grip().primary().annotated(format!(
                    "insufficient implicit default-days (less than {minimum_days})"
                )),
            };

            findings.push(
                Self::finding()
                    .add_location(location)
                    .confidence(Confidence::High)
                    .severity(Severity::Medium)
                    .build(dependabot)?,
            );
        }

        Ok(findings)
    }
}
