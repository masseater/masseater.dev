use anyhow::anyhow;
use serde::{Deserialize, Serialize};

use self::location::{Location, SymbolicLocation};
use crate::features::audit_workflow::{
    audit::AuditError, finding::location::LocationKind, models::AsDocument,
};

pub(crate) mod location;

#[derive(
    Copy, Clone, Debug, Default, Eq, Hash, Ord, PartialOrd, PartialEq, Serialize, Deserialize,
)]
#[serde(rename_all = "lowercase")]
pub enum Persona {
    Auditor,

    Pedantic,

    #[default]
    Regular,
}

#[derive(Copy, Clone, Debug, Eq, Hash, Ord, PartialOrd, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Confidence {
    Low,
    Medium,
    High,
}

#[derive(Copy, Clone, Debug, Eq, Hash, Ord, PartialOrd, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Severity {
    Informational,
    Low,
    Medium,
    High,
}

#[derive(Copy, Clone, Serialize)]
pub(crate) struct Determinations {
    pub(crate) confidence: Confidence,
    pub(crate) severity: Severity,
    pub(super) persona: Persona,
}

pub(crate) struct Finding<'doc> {
    pub(crate) ident: &'static str,

    pub(crate) desc: &'static str,

    pub(crate) url: &'static str,

    pub(crate) determinations: Determinations,

    pub(crate) locations: Vec<Location<'doc>>,

    pub(crate) tip: Option<String>,

    pub(crate) ignored: bool,
}

impl Finding<'_> {
    pub(crate) fn primary_location(&self) -> &Location<'_> {
        self.locations
            .iter()
            .find(|l| l.symbolic.is_primary())
            .expect("internal error: finding has no primary location")
    }
}

pub(crate) struct FindingBuilder<'doc> {
    ident: &'static str,
    desc: &'static str,
    url: &'static str,
    severity: Severity,
    confidence: Confidence,
    persona: Persona,
    raw_locations: Vec<Location<'doc>>,
    locations: Vec<SymbolicLocation<'doc>>,
    tip: Option<String>,
}

impl<'doc> FindingBuilder<'doc> {
    pub(crate) fn new(ident: &'static str, desc: &'static str, url: &'static str) -> Self {
        Self {
            ident,
            desc,
            url,
            severity: Severity::Low,
            confidence: Confidence::Low,
            persona: Persona::default(),
            raw_locations: vec![],
            locations: vec![],
            tip: None,
        }
    }

    pub(crate) fn severity(mut self, severity: Severity) -> Self {
        self.severity = severity;
        self
    }

    pub(crate) fn confidence(mut self, confidence: Confidence) -> Self {
        self.confidence = confidence;
        self
    }

    pub(crate) fn persona(mut self, persona: Persona) -> Self {
        self.persona = persona;
        self
    }

    pub(crate) fn add_raw_location(mut self, location: Location<'doc>) -> Self {
        self.raw_locations.push(location);
        self
    }

    pub(crate) fn add_location(mut self, location: SymbolicLocation<'doc>) -> Self {
        self.locations.push(location);
        self
    }

    pub(crate) fn tip(mut self, tip: impl Into<String>) -> Self {
        self.tip = Some(tip.into());
        self
    }

    pub(crate) fn build<'a>(
        self,
        document: &'a impl AsDocument<'a, 'doc>,
    ) -> Result<Finding<'doc>, AuditError> {
        let mut locations = self
            .locations
            .iter()
            .map(|l| l.clone().concretize(document.as_document()))
            .collect::<anyhow::Result<Vec<_>>>()
            .map_err(|e| AuditError::new(self.ident, e))?;

        locations.extend(self.raw_locations);

        if locations.len() == 1
            && let Some(location) = locations.get_mut(0)
        {
            location.symbolic.kind = LocationKind::Primary;
        } else if !locations.iter().any(|l| l.symbolic.is_primary()) {
            return Err(AuditError::new(
                self.ident,
                anyhow!("API misuse: at least one location must be marked with primary()"),
            ));
        }

        let should_ignore = Self::ignored_from_inlined_comment(&locations, self.ident);

        Ok(Finding {
            ident: self.ident,
            desc: self.desc,
            url: self.url,
            determinations: Determinations {
                confidence: self.confidence,
                severity: self.severity,
                persona: self.persona,
            },
            locations,
            tip: self.tip,
            ignored: should_ignore,
        })
    }

    fn ignored_from_inlined_comment(locations: &[Location], id: &str) -> bool {
        locations
            .iter()
            .flat_map(|l| &l.concrete.comments)
            .any(|c| c.ignores(id))
    }
}
