use std::borrow::Cow;
use std::ops::Range;

use crate::features::audit_workflow::registry::input::InputKey;
use crate::features::audit_workflow::{models::AsDocument, utils::once::static_regex};
use line_index::{LineCol, TextSize};
use serde::Serialize;
use subfeature::Subfeature;

#[derive(Serialize, Copy, Clone, Debug, Default)]
pub(crate) enum LocationKind {
    Primary,

    #[default]
    Related,

    Hidden,
}

#[derive(Serialize, Clone, Debug)]
pub(crate) enum SymbolicFeature<'doc> {
    Normal,

    Subfeature(subfeature::Subfeature<'doc>),

    KeyOnly,
}

#[derive(Serialize, Clone, Debug)]
pub(crate) struct SymbolicLocation<'doc> {
    pub(crate) key: &'doc InputKey,

    pub(crate) annotation: Cow<'doc, str>,

    #[serde(skip_serializing)]
    pub(crate) link: Option<String>,

    pub(crate) route: yamlpath::Route<'doc>,

    pub(crate) feature_kind: SymbolicFeature<'doc>,

    pub(crate) kind: LocationKind,
}

impl<'doc> SymbolicLocation<'doc> {
    #[must_use]
    pub(crate) fn with_keys(
        &self,
        keys: impl IntoIterator<Item = yamlpath::Component<'doc>>,
    ) -> Self {
        SymbolicLocation {
            key: self.key,
            annotation: self.annotation.clone(),
            link: None,
            route: self.route.with_keys(keys),
            feature_kind: SymbolicFeature::Normal,
            kind: self.kind,
        }
    }

    pub(crate) fn subfeature(mut self, subfeature: subfeature::Subfeature<'doc>) -> Self {
        self.feature_kind = SymbolicFeature::Subfeature(subfeature);
        self
    }

    pub(crate) fn key_only(mut self) -> Self {
        self.feature_kind = SymbolicFeature::KeyOnly;
        self
    }

    pub(crate) fn annotated(mut self, annotation: impl Into<Cow<'doc, str>>) -> Self {
        self.annotation = annotation.into();
        self
    }

    pub(crate) fn with_url(mut self, url: impl Into<String>) -> Self {
        self.link = Some(url.into());
        self
    }

    pub(crate) fn primary(mut self) -> Self {
        self.kind = LocationKind::Primary;
        self
    }

    pub(crate) fn hidden(mut self) -> Self {
        self.kind = LocationKind::Hidden;
        self
    }

    pub(crate) fn is_primary(&self) -> bool {
        matches!(self.kind, LocationKind::Primary)
    }

    pub(crate) fn concretize(
        self,
        document: &'doc yamlpath::Document,
    ) -> anyhow::Result<Location<'doc>> {
        let (extracted, location, feature) = match &self.feature_kind {
            SymbolicFeature::Subfeature(subfeature) => {
                let feature = document.query_exact(&self.route)?.ok_or_else(|| {
                    anyhow::anyhow!(
                        "failed to extract exact feature for symbolic location: {}",
                        self.annotation
                    )
                })?;

                let extracted = document.extract(&feature);

                let subfeature_span = subfeature
                    .locate_within(extracted)
                    .ok_or_else(|| {
                        anyhow::anyhow!(
                            "failed to locate subfeature '{subfeature:?}' in feature '{extracted}'",
                        )
                    })?
                    .adjust(feature.location.byte_span.0);

                (
                    extracted,
                    ConcreteLocation::from_span(subfeature_span.as_range(), document),
                    feature,
                )
            }
            SymbolicFeature::Normal => {
                let feature = document.query_pretty(&self.route)?;

                (
                    document.extract_with_leading_whitespace(&feature),
                    ConcreteLocation::from(&feature.location),
                    feature,
                )
            }
            SymbolicFeature::KeyOnly => {
                let feature = document.query_key_only(&self.route)?;

                (
                    document.extract(&feature),
                    ConcreteLocation::from(&feature.location),
                    feature,
                )
            }
        };

        Ok(Location {
            symbolic: self,
            concrete: Feature {
                location,
                text: extracted,
                comments: document
                    .feature_comments(&feature)
                    .into_iter()
                    .map(|f| Comment::extract(document, &f))
                    .collect(),
            },
        })
    }
}

pub(crate) trait Locatable<'doc> {
    fn location(&self) -> SymbolicLocation<'doc>;

    fn location_with_grip(&self) -> SymbolicLocation<'doc> {
        self.location()
    }
}

pub(crate) trait Routable<'a, 'doc> {
    fn route(&'a self) -> yamlpath::Route<'doc>;
}

impl<'a, 'doc, T: Locatable<'doc>> Routable<'a, 'doc> for T {
    fn route(&'a self) -> yamlpath::Route<'doc> {
        self.location().route
    }
}

#[derive(Debug, Copy, Clone, Serialize)]
pub(crate) struct Point {
    pub(crate) row: usize,
    pub(crate) column: usize,
}

impl From<LineCol> for Point {
    fn from(value: LineCol) -> Self {
        Self {
            row: value.line as usize,
            column: value.col as usize,
        }
    }
}

#[derive(Debug, Serialize)]
pub(crate) struct ConcreteLocation {
    pub(crate) start_point: Point,
    pub(crate) end_point: Point,
    pub(crate) offset_span: Range<usize>,
}

impl ConcreteLocation {
    pub(crate) fn new(start_point: Point, end_point: Point, offset_span: Range<usize>) -> Self {
        Self {
            start_point,
            end_point,
            offset_span,
        }
    }

    pub(crate) fn from_span(span: Range<usize>, doc: &yamlpath::Document) -> Self {
        let start = TextSize::new(span.start as u32);
        let end = TextSize::new(span.end as u32);

        let start_point = doc.line_index().line_col(start);
        let end_point = doc.line_index().line_col(end);

        Self {
            start_point: start_point.into(),
            end_point: end_point.into(),
            offset_span: span.clone(),
        }
    }
}

impl From<&yamlpath::Location> for ConcreteLocation {
    fn from(value: &yamlpath::Location) -> Self {
        Self {
            start_point: Point {
                row: value.point_span.0.0,
                column: value.point_span.0.1,
            },
            end_point: Point {
                row: value.point_span.1.0,
                column: value.point_span.1.1,
            },
            offset_span: value.byte_span.0..value.byte_span.1,
        }
    }
}

static_regex!(ANY_COMMENT, r"#.*$");

static_regex!(IGNORE_EXPR, r"# zizmor: ignore\[(.+)\](?:\s+.*)?$");

#[derive(Debug, Serialize)]
#[serde(transparent)]
pub(crate) struct Comment<'doc> {
    raw: &'doc str,

    #[serde(skip)]
    location: ConcreteLocation,
}

impl<'doc> Comment<'doc> {
    pub(crate) fn extract(document: &'doc yamlpath::Document, feature: &yamlpath::Feature) -> Self {
        Self::new(
            document.extract(feature),
            ConcreteLocation::from(&feature.location),
        )
    }

    pub(crate) fn new(raw: &'doc str, location: ConcreteLocation) -> Self {
        Self { raw, location }
    }

    pub(crate) fn is_meaningful(&self) -> bool {
        let content = self
            .as_raw()
            .strip_prefix('#')
            .unwrap_or(self.as_raw())
            .trim();
        !content.is_empty()
    }

    pub(crate) fn ignores(&self, rule_id: &str) -> bool {
        let Some(caps) = IGNORE_EXPR.captures(self.as_raw()) else {
            return false;
        };

        caps.get(1)
            .expect("internal error: missing required capture group")
            .as_str()
            .split(',')
            .any(|r| r.trim() == rule_id)
    }

    pub(crate) fn as_raw(&self) -> &'doc str {
        self.raw
    }

    pub(crate) fn location(&self) -> &ConcreteLocation {
        &self.location
    }
}

#[derive(Serialize)]
pub(crate) struct Feature<'doc> {
    pub(crate) location: ConcreteLocation,

    pub(crate) text: &'doc str,

    pub(crate) comments: Vec<Comment<'doc>>,
}

impl<'doc> Feature<'doc> {
    pub(crate) fn from_subfeature<'a>(
        subfeature: &Subfeature,
        input: &'a impl AsDocument<'a, 'doc>,
    ) -> Self {
        let contents = input.as_document().source();

        let span = subfeature
            .locate_within(contents)
            .expect("subfeature does not occur within feature")
            .as_range();

        Self::from_span(&span, input)
    }

    pub(crate) fn from_span<'a>(span: &Range<usize>, input: &'a impl AsDocument<'a, 'doc>) -> Self {
        let document = input.as_document();
        let raw = input.as_document().source();
        let start = TextSize::new(span.start as u32);
        let end = TextSize::new(span.end as u32);

        let start_point = document.line_index().line_col(start);
        let end_point = document.line_index().line_col(end);

        let comments = (start_point.line..=end_point.line)
            .filter_map(|line| {
                let line_range = document.line_index().line(line)?;

                let line = raw[line_range].trim_end();

                if let Some(raw_comment) = ANY_COMMENT.find(line) {
                    let line_start: usize = line_range.start().into();
                    let comment_location = ConcreteLocation::from_span(
                        line_start + raw_comment.start()..line_start + raw_comment.end(),
                        document,
                    );

                    Some(Comment::new(raw_comment.as_str(), comment_location))
                } else {
                    None
                }
            })
            .collect();

        Feature {
            location: ConcreteLocation::new(
                start_point.into(),
                end_point.into(),
                span.start..span.end,
            ),
            text: &raw[span.start..span.end],
            comments,
        }
    }
}

#[derive(Serialize)]
pub(crate) struct Location<'doc> {
    pub(crate) symbolic: SymbolicLocation<'doc>,

    pub(crate) concrete: Feature<'doc>,
}

impl<'doc> Location<'doc> {
    pub(crate) fn new(symbolic: SymbolicLocation<'doc>, concrete: Feature<'doc>) -> Self {
        Self { symbolic, concrete }
    }
}

#[cfg(test)]
mod tests {
    use yamlpath::Route;

    use crate::features::audit_workflow::{
        finding::location::{
            ConcreteLocation, Feature, LocationKind, Point, SymbolicFeature, SymbolicLocation,
        },
        registry::input::InputKey,
    };

    use super::Comment;

    #[test]
    fn test_comment_locations_are_exact() -> anyhow::Result<()> {
        let input = r"
foo: # comment
  bar: # another comment
    - a
    - b
    - c # third comment
  baz: |- # fourth comment
    some content
";

        let doc = yamlpath::Document::new(input)?;
        let symbolic = SymbolicLocation {
            key: &InputKey::local("<stdin>", None),
            annotation: "zing".into(),
            link: None,
            route: Route::default(),
            feature_kind: SymbolicFeature::Normal,
            kind: LocationKind::Primary,
        };

        let feature = symbolic.concretize(&doc)?;

        assert_eq!(feature.concrete.comments.len(), 4);
        for comment in feature.concrete.comments {
            assert_eq!(
                comment.as_raw(),
                &input[comment.location().offset_span.start..comment.location().offset_span.end]
            );
        }

        let feature = Feature::from_span(&(0..input.len()), &doc);

        assert_eq!(feature.comments.len(), 4);
        for comment in feature.comments {
            assert_eq!(
                comment.as_raw(),
                &input[comment.location().offset_span.start..comment.location().offset_span.end]
            );
        }

        Ok(())
    }

    #[test]
    fn test_comment_ignores() {
        let cases = &[
            ("# zizmor: ignore[foo]", "foo", true),
            ("# zizmor: ignore[foo,bar]", "foo", true),
            ("# zizmor: ignore[foo,bar,foo-bar]", "foo-bar", true),
            ("# zizmor: ignore[foo, bar,   foo-bar]", "foo-bar", true),
            ("# zizmor: ignore[foo,foo,,foo,,,,foo,]", "foo", true),
            ("# zizmor: ignore[foo] some other stuff", "foo", true),
            ("# zizmor: ignore[foo] ", "foo", true),
            ("# zizmor: ignore[foo]  ", "foo", true),
            ("# zizmor: ignore[foo]   ", "foo", true),
            ("# zizmor: ignore[foo]some other stuff", "foo", false),
            ("# zizmor: ignore[foo,bar]", "baz", false),
            ("# zizmor: ignore[]", "", false),
            ("# zizmor: ignore[]", "foo", false),
            ("# zizmor: ignore[foo bar]", "foo", false),
            ("# zizmor: ignore[foo", "foo", false),
            ("# zizmor: ignore foo", "foo", false),
            ("# zizmor: ignore foo]", "foo", false),
            ("# zizmor:ignore[foo]", "foo", false),
            ("#zizmor: ignore[foo]", "foo", false),
            ("#  zizmor: ignore[foo]", "foo", false),
            ("#  zizmor:  ignore[foo]", "foo", false),
        ];

        for (comment, rule, ignores) in cases {
            let noop_location = ConcreteLocation::new(
                Point { row: 0, column: 0 },
                Point { row: 0, column: 0 },
                0..0,
            );
            assert_eq!(
                Comment::new(comment, noop_location).ignores(rule),
                *ignores,
                "{comment} does not ignore {rule}"
            );
        }
    }
}
