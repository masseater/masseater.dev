use std::collections::BTreeMap;

use serde_json::Value;

#[derive(Debug, Clone, PartialEq)]
pub enum ExprType {
    Any,
    Null,
    Number,
    Bool,
    String,
    Object(ObjectType),
    Array(ArrayType),
}

#[derive(Debug, Clone, PartialEq, Default)]
pub struct ObjectType {
    pub props: BTreeMap<String, ExprType>,
    pub mapped: Option<Box<ExprType>>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ArrayType {
    pub elem: Box<ExprType>,
    pub deref: bool,
}

impl ObjectType {
    #[must_use]
    pub fn loose() -> Self {
        Self {
            props: BTreeMap::new(),
            mapped: Some(Box::new(ExprType::Any)),
        }
    }

    #[must_use]
    pub fn loose_with(props: BTreeMap<String, ExprType>) -> Self {
        Self {
            props,
            mapped: Some(Box::new(ExprType::Any)),
        }
    }

    #[must_use]
    pub fn strict() -> Self {
        Self::default()
    }

    #[must_use]
    pub fn strict_with(props: BTreeMap<String, ExprType>) -> Self {
        Self {
            props,
            mapped: None,
        }
    }

    #[must_use]
    pub fn map_of(elem: ExprType) -> Self {
        Self {
            props: BTreeMap::new(),
            mapped: Some(Box::new(elem)),
        }
    }

    #[must_use]
    pub fn is_strict(&self) -> bool {
        self.mapped.is_none()
    }

    #[must_use]
    pub fn is_loose(&self) -> bool {
        matches!(self.mapped.as_deref(), Some(ExprType::Any))
    }

    pub fn set_loose(&mut self) {
        self.mapped = Some(Box::new(ExprType::Any));
    }

    fn describe(&self) -> String {
        if let Some(mapped) = &self.mapped {
            if self.is_loose() {
                return "object".to_owned();
            }
            return format!("{{string => {}}}", mapped.describe());
        }
        let inner: Vec<String> = self
            .props
            .iter()
            .map(|(name, ty)| format!("{name}: {}", ty.describe()))
            .collect();
        format!("{{{}}}", inner.join("; "))
    }

    fn assignable(&self, other: &ExprType) -> bool {
        match other {
            ExprType::Any => true,
            ExprType::Object(other) => match (&self.mapped, &other.mapped) {
                (Some(mine), Some(theirs)) => mine.assignable(theirs),
                (Some(mine), None) => other.props.values().all(|t| mine.assignable(t)),
                (None, Some(theirs)) => self.props.values().all(|t| t.assignable(theirs)),
                (None, None) => other
                    .props
                    .iter()
                    .all(|(name, r)| self.props.get(name).is_some_and(|l| l.assignable(r))),
            },
            _ => false,
        }
    }

    fn merge(&self, other: &ObjectType) -> ExprType {
        if self.props.is_empty() && other.is_loose() {
            return ExprType::Object(other.clone());
        }
        if other.props.is_empty() && self.is_loose() {
            return ExprType::Object(self.clone());
        }
        let mut mapped = match (&self.mapped, &other.mapped) {
            (None, theirs) => theirs.clone(),
            (Some(mine), Some(theirs)) => Some(Box::new(mine.merge(theirs))),
            (Some(mine), None) => Some(mine.clone()),
        };
        let mut props = self.props.clone();
        for (name, r) in &other.props {
            if let Some(l) = props.get(name) {
                let merged = l.merge(r);
                props.insert(name.clone(), merged);
            } else {
                props.insert(name.clone(), r.clone());
                if let Some(m) = &mapped {
                    mapped = Some(Box::new(m.merge(r)));
                }
            }
        }
        ExprType::Object(ObjectType { props, mapped })
    }
}

impl ExprType {
    #[must_use]
    pub fn array(elem: ExprType) -> Self {
        ExprType::Array(ArrayType {
            elem: Box::new(elem),
            deref: false,
        })
    }

    #[must_use]
    pub fn describe(&self) -> String {
        match self {
            ExprType::Any => "any".to_owned(),
            ExprType::Null => "null".to_owned(),
            ExprType::Number => "number".to_owned(),
            ExprType::Bool => "bool".to_owned(),
            ExprType::String => "string".to_owned(),
            ExprType::Object(object) => object.describe(),
            ExprType::Array(array) => format!("array<{}>", array.elem.describe()),
        }
    }

    #[must_use]
    pub fn assignable(&self, other: &ExprType) -> bool {
        match self {
            ExprType::Any | ExprType::Bool => true,
            ExprType::Null => matches!(other, ExprType::Null | ExprType::Any),
            ExprType::Number => matches!(other, ExprType::Number | ExprType::Any),
            ExprType::String => {
                matches!(other, ExprType::String | ExprType::Number | ExprType::Any)
            }
            ExprType::Object(object) => object.assignable(other),
            ExprType::Array(array) => match other {
                ExprType::Any => true,
                ExprType::Array(other) => array.elem.assignable(&other.elem),
                _ => false,
            },
        }
    }

    #[must_use]
    pub fn merge(&self, other: &ExprType) -> ExprType {
        match (self, other) {
            (ExprType::Any, _) => ExprType::Any,
            (ExprType::Null, ExprType::Null) => ExprType::Null,
            (ExprType::Number, ExprType::Number) => ExprType::Number,
            (ExprType::Number | ExprType::Bool, ExprType::String) => ExprType::String,
            (ExprType::Bool, ExprType::Bool) => ExprType::Bool,
            (ExprType::String, ExprType::String | ExprType::Number | ExprType::Bool) => {
                ExprType::String
            }
            (ExprType::Object(mine), ExprType::Object(theirs)) => mine.merge(theirs),
            (ExprType::Array(mine), ExprType::Array(theirs)) => {
                if *mine.elem == ExprType::Any {
                    return self.clone();
                }
                if *theirs.elem == ExprType::Any {
                    return other.clone();
                }
                ExprType::array(mine.elem.merge(&theirs.elem))
            }
            _ => ExprType::Any,
        }
    }

    #[must_use]
    pub fn of_json(value: &Value) -> ExprType {
        match value {
            Value::Bool(_) => ExprType::Bool,
            Value::Number(_) => ExprType::Number,
            Value::String(_) => ExprType::String,
            Value::Null => ExprType::Null,
            Value::Array(items) => {
                let elem = items
                    .iter()
                    .map(ExprType::of_json)
                    .reduce(|acc, t| acc.merge(&t))
                    .unwrap_or(ExprType::Any);
                ExprType::array(elem)
            }
            Value::Object(map) => ExprType::Object(ObjectType::strict_with(
                map.iter()
                    .map(|(k, v)| (k.clone(), ExprType::of_json(v)))
                    .collect(),
            )),
        }
    }
}
