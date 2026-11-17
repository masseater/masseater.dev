use crate::features::audit_workflow::{
    audit::AuditError,
    finding::{
        Confidence, Finding, Persona, Severity,
        location::{Locatable as _, SymbolicLocation},
    },
    models::{
        AsDocument,
        action::DockerAction,
        workflow::{StepInner, matrix::Matrix},
    },
    state::AuditState,
};

use github_actions_expressions::{Expr, SpannedExpr, literal::Literal};
use github_actions_models::{
    action::DockerActionUses,
    common::{
        DockerUses,
        expr::{ExplicitExpr, LoE},
    },
};
use github_actions_models::{
    common::Uses,
    workflow::job::{Container, UsesStep},
};
use subfeature::Subfeature;

use super::{Audit, AuditLoadError, audit_meta};

pub(crate) struct UnpinnedImages;

#[derive(Clone, Copy)]
enum Image<'doc> {
    Literal(&'doc DockerUses),
    Expr(&'doc ExplicitExpr),
}

impl<'doc> From<&'doc LoE<DockerUses>> for Image<'doc> {
    fn from(value: &'doc LoE<DockerUses>) -> Self {
        match value {
            LoE::Expr(expr) => Image::Expr(expr),
            LoE::Literal(lit) => Image::Literal(lit),
        }
    }
}

impl<'doc> From<&'doc DockerUses> for Image<'doc> {
    fn from(value: &'doc DockerUses) -> Self {
        Image::Literal(value)
    }
}

struct ImageCandidate<'doc> {
    annotation: &'static str,
    confidence: Confidence,
    persona: Persona,
    location: SymbolicLocation<'doc>,
    related: Vec<SymbolicLocation<'doc>>,
}

impl<'doc> ImageCandidate<'doc> {
    fn concrete(
        image: &DockerUses,
        location: SymbolicLocation<'doc>,
        related: Vec<SymbolicLocation<'doc>>,
    ) -> Option<Self> {
        if image.image().is_empty() {
            return None;
        }

        let (annotation, persona) = match (image.tag(), image.hash()) {
            (_, Some(_)) => return None,
            (Some("latest"), None) => (
                "container image uses the floating 'latest' tag",
                Persona::Regular,
            ),
            (Some(_), None) => (
                "container image is not pinned to a SHA256 hash",
                Persona::Pedantic,
            ),
            (None, None) => ("container image is unpinned", Persona::Regular),
        };

        Some(Self {
            annotation,
            confidence: Confidence::High,
            persona,
            location,
            related,
        })
    }

    fn opaque(location: SymbolicLocation<'doc>, related: Vec<SymbolicLocation<'doc>>) -> Self {
        Self {
            annotation: "container image may be unpinned",
            confidence: Confidence::Low,
            persona: Persona::Regular,
            location,
            related,
        }
    }
}

fn collect_candidates<'doc>(
    image: Image<'doc>,
    location: &SymbolicLocation<'doc>,
    matrix: Option<&Matrix<'doc>>,
) -> Vec<ImageCandidate<'doc>> {
    match image {
        Image::Literal(image) => ImageCandidate::concrete(image, location.clone(), vec![])
            .into_iter()
            .collect(),

        Image::Expr(expr) => {
            let Ok(parsed) = Expr::parse(expr.as_bare()) else {
                return vec![ImageCandidate::opaque(location.clone(), vec![])];
            };

            let leaves = parsed.leaf_expressions();

            let single_leaf = leaves.len() == 1;

            leaves
                .into_iter()
                .flat_map(|leaf| {
                    let leaf_location = if single_leaf {
                        location.clone()
                    } else {
                        location
                            .clone()
                            .subfeature(Subfeature::new(0, subfeature::Fragment::from(leaf)))
                    };

                    candidates_for_leaf(leaf, leaf_location, matrix)
                })
                .collect()
        }
    }
}

fn candidates_for_leaf<'doc>(
    leaf: &SpannedExpr<'_>,
    location: SymbolicLocation<'doc>,
    matrix: Option<&Matrix<'doc>>,
) -> Vec<ImageCandidate<'doc>> {
    match &leaf.inner {
        Expr::Literal(Literal::String(image)) => {
            if image.is_empty() {
                vec![]
            } else {
                ImageCandidate::concrete(&DockerUses::parse(image.as_ref()), location, vec![])
                    .into_iter()
                    .collect()
            }
        }

        Expr::Context(context) if context.child_of("matrix") => {
            let Some(matrix) = matrix else {
                tracing::warn!(
                    "image references {raw} but job has no matrix",
                    raw = leaf.origin.raw
                );
                return vec![];
            };

            let expansions = matrix.expansions();

            let mut candidates = expansions
                .iter()
                .filter(|expansion| context.matches(expansion.path.as_str()))
                .filter(|expansion| expansion.is_static())
                .filter_map(|expansion| {
                    let annotations = vec![
                        matrix.location().key_only(),
                        expansion
                            .location()
                            .annotated(format!("this expansion of {path}", path = expansion.path)),
                    ];

                    ImageCandidate::concrete(
                        &DockerUses::parse(&expansion.value),
                        location.clone(),
                        annotations,
                    )
                })
                .collect::<Vec<_>>();

            if expansions.has_indirect_expansions() {
                let mut annotations = vec![matrix.location().key_only().annotated("this matrix")];

                let indirect_matrix = expansions.indirectly_expanded().map(|location| {
                    location
                        .clone()
                        .annotated("indirect `matrix` adds unanalyzable combinations")
                });

                let indirect_inclusions = expansions.indirect_inclusions().map(|location| {
                    location
                        .clone()
                        .annotated("`include` may add unanalyzable combinations")
                });

                annotations.extend(indirect_matrix);
                annotations.extend(indirect_inclusions);

                candidates.push(ImageCandidate::opaque(location.clone(), annotations));
            }

            candidates
        }

        _ => vec![ImageCandidate::opaque(location, vec![])],
    }
}

impl UnpinnedImages {
    fn classify_images<'a, 'doc>(
        image_refs: Vec<(Image<'doc>, SymbolicLocation<'doc>)>,
        matrix: Option<&Matrix<'doc>>,
        document: &'a impl AsDocument<'a, 'doc>,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        let mut findings = vec![];

        for (image, location) in image_refs {
            for candidate in collect_candidates(image, &location, matrix) {
                let mut finding = Self::finding()
                    .severity(Severity::High)
                    .confidence(candidate.confidence)
                    .persona(candidate.persona)
                    .add_location(candidate.location.annotated(candidate.annotation));

                for related in candidate.related {
                    finding = finding.add_location(related);
                }

                findings.push(finding.build(document)?);
            }
        }

        Ok(findings)
    }
}

audit_meta!(
    UnpinnedImages,
    "unpinned-images",
    "unpinned image references"
);

impl Audit for UnpinnedImages {
    fn new(_state: &AuditState) -> Result<Self, AuditLoadError> {
        Ok(Self)
    }

    fn audit_docker_action<'doc>(
        &self,
        docker: &DockerAction<'doc>,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> anyhow::Result<Vec<Finding<'doc>>, AuditError> {
        let DockerActionUses::Image(image) = &docker.image else {
            return Ok(vec![]);
        };

        Self::classify_images(
            vec![(image.into(), docker.location().with_keys(["image".into()]))],
            None,
            docker,
        )
    }

    fn audit_normal_job<'doc>(
        &self,
        job: &super::NormalJob<'doc>,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> anyhow::Result<Vec<Finding<'doc>>, AuditError> {
        let mut image_refs: Vec<(Image<'doc>, SymbolicLocation<'doc>)> = vec![];

        match &job.container {
            Some(Container::Name(image)) => {
                image_refs.push((
                    image.into(),
                    job.location().primary().with_keys(["container".into()]),
                ));
            }
            Some(Container::Container { image, .. }) => {
                image_refs.push((
                    image.into(),
                    job.location()
                        .primary()
                        .with_keys(["container".into(), "image".into()]),
                ));
            }
            None => {}
        }

        for (service, config) in &job.services {
            if let Container::Container { image, .. } = &config {
                image_refs.push((
                    image.into(),
                    job.location().primary().with_keys([
                        "services".into(),
                        service.as_str().into(),
                        "image".into(),
                    ]),
                ));
            }
        }

        for step in job.steps() {
            if let StepInner::Uses(UsesStep {
                uses: Uses::Docker(uses),
                ..
            }) = &*step
            {
                image_refs.push((
                    uses.into(),
                    step.location()
                        .primary()
                        .with_keys(["uses".into()])
                        .subfeature(Subfeature::new(0, uses.raw())),
                ));
            }
        }

        Self::classify_images(image_refs, job.matrix().as_ref(), job)
    }
}
