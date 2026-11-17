use crate::features::audit_workflow::{
    finding::location::{Locatable, SymbolicLocation},
    models::workflow::NormalJob,
    utils::extract_fenced_expressions,
};
use github_actions_expressions::context::Context;
use github_actions_models::{common::expr::LoE, workflow::job};
use indexmap::IndexMap;

#[derive(Clone, Debug)]
pub(crate) struct Expansion<'doc> {
    pub(crate) path: String,

    pub(crate) value: String,

    location: SymbolicLocation<'doc>,
}

impl PartialEq for Expansion<'_> {
    fn eq(&self, other: &Self) -> bool {
        self.path == other.path && self.value == other.value
    }
}

impl<'doc> Locatable<'doc> for Expansion<'doc> {
    fn location(&self) -> SymbolicLocation<'doc> {
        self.location.clone()
    }
}

impl<'doc> Expansion<'doc> {
    fn new(path: String, value: String, location: SymbolicLocation<'doc>) -> Self {
        Self {
            path,
            value,
            location,
        }
    }

    pub(crate) fn is_static(&self) -> bool {
        extract_fenced_expressions(&self.value).is_empty()
    }
}

#[derive(Clone, Debug)]
pub(crate) struct Expansions<'doc> {
    all: Vec<Expansion<'doc>>,

    indirectly_expanded: Option<SymbolicLocation<'doc>>,

    indirect_inclusions: Option<SymbolicLocation<'doc>>,
}

impl<'doc> Expansions<'doc> {
    pub(crate) fn new(matrix: &LoE<job::Matrix>, parent: &NormalJob<'doc>) -> Self {
        let matrix_location = parent
            .location()
            .with_keys(["strategy".into(), "matrix".into()])
            .annotated("this matrix");
        Self::expand_values(matrix, &matrix_location)
    }

    pub(crate) fn iter(&self) -> impl Iterator<Item = &Expansion<'doc>> {
        self.all.iter()
    }

    pub(crate) fn indirectly_expanded(&self) -> Option<&SymbolicLocation<'doc>> {
        self.indirectly_expanded.as_ref()
    }

    pub(crate) fn indirect_inclusions(&self) -> Option<&SymbolicLocation<'doc>> {
        self.indirect_inclusions.as_ref()
    }

    pub(crate) fn has_indirect_expansions(&self) -> bool {
        self.indirectly_expanded.is_some() || self.indirect_inclusions.is_some()
    }

    fn expand_values(matrix: &LoE<job::Matrix>, location: &SymbolicLocation<'doc>) -> Self {
        match matrix {
            LoE::Expr(_) => Self {
                all: vec![],

                indirectly_expanded: Some(location.clone()),
                indirect_inclusions: None,
            },
            LoE::Literal(inner) => {
                let LoE::Literal(dimensions) = &inner.dimensions else {
                    return Self {
                        all: vec![],

                        indirectly_expanded: Some(location.clone()),
                        indirect_inclusions: None,
                    };
                };

                let mut expanded = Self::expand_dimensions(dimensions, location);

                if let LoE::Literal(excludes) = &inner.exclude {
                    let to_exclude = excludes
                        .iter()
                        .flat_map(|exclude| {
                            Self::expand_explicit_rows(
                                exclude,
                                &location.with_keys(["exclude".into()]),
                            )
                        })
                        .collect::<Vec<_>>();

                    expanded.retain(|expanded| !to_exclude.contains(expanded));
                }

                if let LoE::Literal(includes) = &inner.include {
                    let additional_expansions = includes
                        .iter()
                        .enumerate()
                        .flat_map(|(idx, include)| {
                            Self::expand_explicit_rows(
                                include,
                                &location.with_keys(["include".into(), idx.into()]),
                            )
                        })
                        .collect::<Vec<_>>();

                    expanded.extend(additional_expansions);
                }

                let maybe_indirect_inclusions = match &inner.include {
                    LoE::Expr(_) => Some(location.clone().with_keys(["include".into()])),
                    LoE::Literal(_) => None,
                };

                Self {
                    all: expanded,
                    indirectly_expanded: None,
                    indirect_inclusions: maybe_indirect_inclusions,
                }
            }
        }
    }

    fn expand_explicit_rows(
        include: &IndexMap<String, yaml_serde::Value>,
        base: &SymbolicLocation<'doc>,
    ) -> Vec<Expansion<'doc>> {
        let normalized = include
            .iter()
            .map(|(k, v)| (k.to_owned(), serde_json::json!(v)))
            .collect::<IndexMap<_, _>>();

        Self::expand(normalized, base)
    }

    fn expand_dimensions(
        dimensions: &IndexMap<String, LoE<Vec<yaml_serde::Value>>>,
        base: &SymbolicLocation<'doc>,
    ) -> Vec<Expansion<'doc>> {
        let normalized = dimensions
            .iter()
            .map(|(k, v)| (k.to_owned(), serde_json::json!(v)))
            .collect::<IndexMap<_, _>>();

        Self::expand(normalized, base)
    }

    fn expand(
        values: IndexMap<String, serde_json::Value>,
        base: &SymbolicLocation<'doc>,
    ) -> Vec<Expansion<'doc>> {
        values
            .into_iter()
            .flat_map(|(key, value)| {
                Self::walk_path(
                    value,
                    format!("matrix.{key}"),
                    base.with_keys([key.into()]).annotated("this expansion"),
                )
            })
            .collect()
    }

    fn walk_path(
        tree: serde_json::Value,
        current_path: String,
        base: SymbolicLocation<'doc>,
    ) -> Vec<Expansion<'doc>> {
        match tree {
            serde_json::Value::Null => vec![],

            serde_json::Value::Bool(inner) => {
                vec![Expansion::new(current_path, inner.to_string(), base)]
            }
            serde_json::Value::Number(inner) => {
                vec![Expansion::new(current_path, inner.to_string(), base)]
            }
            serde_json::Value::String(inner) => {
                vec![Expansion::new(current_path, inner.clone(), base)]
            }

            serde_json::Value::Array(inner) => inner
                .into_iter()
                .enumerate()
                .flat_map(|(idx, value)| {
                    Self::walk_path(value, current_path.clone(), base.with_keys([idx.into()]))
                })
                .collect(),

            serde_json::Value::Object(inner) => inner
                .into_iter()
                .flat_map(|(key, value)| {
                    let mut new_path = current_path.clone();
                    new_path.push('.');
                    new_path.push_str(&key);
                    Self::walk_path(value, new_path, base.with_keys([key.into()]))
                })
                .collect(),
        }
    }
}

#[derive(Clone)]
pub(crate) struct Matrix<'doc> {
    inner: &'doc LoE<job::Matrix>,
    parent: NormalJob<'doc>,
    expansions: Expansions<'doc>,
}

impl<'doc> Matrix<'doc> {
    pub(super) fn new(parent: &NormalJob<'doc>) -> Option<Self> {
        let matrix = parent.strategy.as_ref()?.matrix.as_ref()?;

        Some(Self {
            inner: matrix,
            parent: parent.clone(),
            expansions: Expansions::new(matrix, parent),
        })
    }

    pub(crate) fn expansions(&self) -> &Expansions<'doc> {
        &self.expansions
    }

    pub(crate) fn expands_to_static_values(&self, context: &Context) -> bool {
        if self.expansions().indirectly_expanded.is_some() {
            return false;
        }

        let expands_to_expression = self
            .expansions()
            .iter()
            .any(|expansion| context.matches(expansion.path.as_str()) && !expansion.is_static());

        !expands_to_expression
    }
}

impl<'doc> std::ops::Deref for Matrix<'doc> {
    type Target = &'doc LoE<job::Matrix>;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl<'doc> Locatable<'doc> for Matrix<'doc> {
    fn location(&self) -> SymbolicLocation<'doc> {
        self.parent
            .location()
            .with_keys(["strategy".into(), "matrix".into()])
            .annotated("this matrix")
    }
}

#[cfg(test)]
mod tests {
    use github_actions_expressions::context::Context;

    use crate::features::audit_workflow::{
        models::{
            AsDocument as _,
            workflow::{NormalJob, Workflow, matrix::Matrix},
        },
        registry::input::InputKey,
    };

    #[test]
    fn test_matrix_expanded_values() -> anyhow::Result<()> {
        let workflow_yaml = r"
name: test
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node: [12, 14, 16]
        nested:
          - { a: 1, b: 2 }
          - { a: 3, b: 4 }
        include:
          - os: ubuntu-latest
            node: 18
            nested:
              a: 5
              b: 6
    steps:
      - run: true
        ";

        let workflow =
            Workflow::from_string(workflow_yaml, InputKey::local("test.yml", None)).unwrap();

        let job = {
            let github_actions_models::workflow::Job::NormalJob(job) =
                workflow.jobs.get("test").unwrap()
            else {
                panic!("Expected a normal job");
            };

            NormalJob::new("test", job, &workflow)
        };

        let matrix = Matrix::new(&job).unwrap();

        let summary: Vec<String> = matrix
            .expansions()
            .iter()
            .map(|expansion| {
                let location = &expansion.location;
                format!(
                    "{} = {} at {} {:?} ({}, {:?}, {:?}, {:?})",
                    expansion.path,
                    expansion.value,
                    location.key.presentation_path(),
                    location.route,
                    location.annotation,
                    location.link,
                    location.feature_kind,
                    location.kind,
                )
            })
            .collect();
        insta::assert_debug_snapshot!(summary, @r#"
        [
            "matrix.os = ubuntu-latest at test.yml Route { route: [Key(\"jobs\"), Key(\"test\"), Key(\"strategy\"), Key(\"matrix\"), Key(\"os\"), Index(0)] } (this expansion, None, Normal, Related)",
            "matrix.os = windows-latest at test.yml Route { route: [Key(\"jobs\"), Key(\"test\"), Key(\"strategy\"), Key(\"matrix\"), Key(\"os\"), Index(1)] } (this expansion, None, Normal, Related)",
            "matrix.os = macos-latest at test.yml Route { route: [Key(\"jobs\"), Key(\"test\"), Key(\"strategy\"), Key(\"matrix\"), Key(\"os\"), Index(2)] } (this expansion, None, Normal, Related)",
            "matrix.node = 12 at test.yml Route { route: [Key(\"jobs\"), Key(\"test\"), Key(\"strategy\"), Key(\"matrix\"), Key(\"node\"), Index(0)] } (this expansion, None, Normal, Related)",
            "matrix.node = 14 at test.yml Route { route: [Key(\"jobs\"), Key(\"test\"), Key(\"strategy\"), Key(\"matrix\"), Key(\"node\"), Index(1)] } (this expansion, None, Normal, Related)",
            "matrix.node = 16 at test.yml Route { route: [Key(\"jobs\"), Key(\"test\"), Key(\"strategy\"), Key(\"matrix\"), Key(\"node\"), Index(2)] } (this expansion, None, Normal, Related)",
            "matrix.nested.a = 1 at test.yml Route { route: [Key(\"jobs\"), Key(\"test\"), Key(\"strategy\"), Key(\"matrix\"), Key(\"nested\"), Index(0), Key(\"a\")] } (this expansion, None, Normal, Related)",
            "matrix.nested.b = 2 at test.yml Route { route: [Key(\"jobs\"), Key(\"test\"), Key(\"strategy\"), Key(\"matrix\"), Key(\"nested\"), Index(0), Key(\"b\")] } (this expansion, None, Normal, Related)",
            "matrix.nested.a = 3 at test.yml Route { route: [Key(\"jobs\"), Key(\"test\"), Key(\"strategy\"), Key(\"matrix\"), Key(\"nested\"), Index(1), Key(\"a\")] } (this expansion, None, Normal, Related)",
            "matrix.nested.b = 4 at test.yml Route { route: [Key(\"jobs\"), Key(\"test\"), Key(\"strategy\"), Key(\"matrix\"), Key(\"nested\"), Index(1), Key(\"b\")] } (this expansion, None, Normal, Related)",
            "matrix.os = ubuntu-latest at test.yml Route { route: [Key(\"jobs\"), Key(\"test\"), Key(\"strategy\"), Key(\"matrix\"), Key(\"include\"), Index(0), Key(\"os\")] } (this expansion, None, Normal, Related)",
            "matrix.node = 18 at test.yml Route { route: [Key(\"jobs\"), Key(\"test\"), Key(\"strategy\"), Key(\"matrix\"), Key(\"include\"), Index(0), Key(\"node\")] } (this expansion, None, Normal, Related)",
            "matrix.nested.a = 5 at test.yml Route { route: [Key(\"jobs\"), Key(\"test\"), Key(\"strategy\"), Key(\"matrix\"), Key(\"include\"), Index(0), Key(\"nested\"), Key(\"a\")] } (this expansion, None, Normal, Related)",
            "matrix.nested.b = 6 at test.yml Route { route: [Key(\"jobs\"), Key(\"test\"), Key(\"strategy\"), Key(\"matrix\"), Key(\"include\"), Index(0), Key(\"nested\"), Key(\"b\")] } (this expansion, None, Normal, Related)",
        ]
        "#);

        for expansion in matrix.expansions().all.clone() {
            expansion.location.concretize(workflow.as_document())?;
        }

        Ok(())
    }

    #[test]
    fn test_direct_matrix_expands_to_static_values() -> anyhow::Result<()> {
        let workflow_yaml = r"
name: test
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        trivially-static: [a, b, c, d]
        trivially-dynamic: [a, '${{ github.ref }}', c, d]
        nested-static:
          - { a: 1, b: 2 }
          - { a: 3, b: 4 }
        nested-dynamic:
          - { a: 1, b: '${{ github.ref }}' }
          - { a: 3, b: 4 }
    steps:
      - run: true
        ";

        let workflow = Workflow::from_string(workflow_yaml, InputKey::local("test.yml", None))?;

        let job = {
            let github_actions_models::workflow::Job::NormalJob(job) =
                workflow.jobs.get("test").unwrap()
            else {
                panic!("Expected a normal job");
            };

            NormalJob::new("test", job, &workflow)
        };

        let matrix = Matrix::new(&job).unwrap();

        assert!(
            matrix.expands_to_static_values(&Context::parse("matrix.trivially-static").unwrap())
        );
        assert!(
            !matrix.expands_to_static_values(&Context::parse("matrix.trivially-dynamic").unwrap())
        );
        assert!(
            matrix.expands_to_static_values(&Context::parse("matrix.nested-static.a").unwrap())
        );
        assert!(
            !matrix.expands_to_static_values(&Context::parse("matrix.nested-dynamic.b").unwrap())
        );

        assert!(matrix.expands_to_static_values(&Context::parse("matrix.nonexistent").unwrap()));

        Ok(())
    }

    #[test]
    fn test_indirect_matrix_expands_to_static_values() -> anyhow::Result<()> {
        let workflow_yaml = r"
name: test
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix: ${{ dynamic }}
    steps:
      - run: true
        ";

        let workflow = Workflow::from_string(workflow_yaml, InputKey::local("test.yml", None))?;

        let job = {
            let github_actions_models::workflow::Job::NormalJob(job) =
                workflow.jobs.get("test").unwrap()
            else {
                panic!("Expected a normal job");
            };

            NormalJob::new("test", job, &workflow)
        };

        let matrix = Matrix::new(&job).unwrap();
        let expansions = matrix.expansions();
        assert_eq!(expansions.all.len(), 0);
        assert!(expansions.indirectly_expanded.is_some());
        assert!(expansions.indirect_inclusions.is_none());

        Ok(())
    }

    #[test]
    fn test_matrix_expands_indirect_exclusions_inclusions() -> anyhow::Result<()> {
        let workflow_yaml = r"
name: test
on: push
jobs:
  indirect-matrix:
    name: indirect-matrix
    runs-on: ubuntu-26.04
    container:
      image: ${{ matrix.image }}
    strategy:
      matrix:
        arch: [x86_64, aarch64]
        image:
          - ubuntu@latest
        include: ${{ fromJSON(vars.EXTRA_TARGETS) }}
        exclude: ${{ fromJSON(vars.KNOWN_BROKEN_COMBOS) }}
    steps:
      - name: Noop
        run: true
        ";

        let workflow =
            Workflow::from_string(workflow_yaml, InputKey::local("indirect-matrix.yml", None))?;

        let job = {
            let github_actions_models::workflow::Job::NormalJob(job) =
                workflow.jobs.get("indirect-matrix").unwrap()
            else {
                panic!("Expected a normal job");
            };

            NormalJob::new("indirect-matrix", job, &workflow)
        };

        let matrix = Matrix::new(&job).unwrap();
        let expansions = matrix.expansions();

        assert_eq!(expansions.all.len(), 3);
        assert!(expansions.indirectly_expanded.is_none());
        assert!(expansions.indirect_inclusions.is_some());

        Ok(())
    }
}
