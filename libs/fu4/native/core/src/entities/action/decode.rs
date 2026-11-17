use std::collections::BTreeMap;

use super::{ActionInput, ActionMetadata, ActionRuns, Branding};
use crate::shared::text::quote;
use crate::shared::yaml::{Kind, Node, load};

struct Decoder {
    errors: Vec<String>,
}

fn tag_of(node: &Node) -> &str {
    match node.kind {
        Kind::Mapping => "!!map",
        Kind::Sequence => "!!seq",
        Kind::Scalar | Kind::Alias => node.tag.as_str(),
    }
}

fn shown(node: &Node) -> String {
    let tag = tag_of(node);
    if node.kind != Kind::Scalar {
        return tag.to_owned();
    }
    let value: String = node.value.chars().take(10).collect();
    let value = if node.value.chars().count() > 10 {
        format!("{value} ...")
    } else {
        value
    };
    format!("{tag} `{value}`")
}

impl Decoder {
    fn type_error(&mut self, node: &Node, target: &str) {
        self.errors.push(format!(
            "line {}: cannot unmarshal {} into {target}",
            node.pos.line,
            shown(node)
        ));
    }

    fn custom(&mut self, node: &Node, message: String) {
        self.errors
            .push(format!("line {}: {message}", node.pos.line));
    }

    fn string(&mut self, node: &Node) -> String {
        match node.kind {
            Kind::Scalar if node.is_null() => String::new(),
            Kind::Scalar => node.value.clone(),
            _ => {
                self.type_error(node, "string");
                String::new()
            }
        }
    }

    fn boolean(&mut self, node: &Node) -> bool {
        if node.kind == Kind::Scalar {
            if node.is_null() {
                return false;
            }
            if node.tag == "!!bool" {
                return matches!(node.value.as_str(), "true" | "True" | "TRUE");
            }
            if !node.is_quoted() {
                match node.value.as_str() {
                    "y" | "Y" | "yes" | "Yes" | "YES" | "on" | "On" | "ON" => return true,
                    "n" | "N" | "no" | "No" | "NO" | "off" | "Off" | "OFF" => return false,
                    _ => {}
                }
            }
        }
        self.type_error(node, "bool");
        false
    }

    fn present(&mut self, node: &Node, kind: Kind, target: &str) -> bool {
        if node.is_null() {
            return false;
        }
        if node.kind != kind {
            self.type_error(node, target);
            return false;
        }
        true
    }

    fn mapping_or_error(&mut self, node: &Node, where_: &str) -> bool {
        if node.kind == Kind::Mapping {
            return true;
        }
        self.custom(
            node,
            format!(
                "yaml: {where_} must be mapping node but {} node was found at line:{}, col:{}",
                node.kind.name(),
                node.pos.line,
                node.pos.col
            ),
        );
        false
    }

    fn input(&mut self, node: &Node) -> Result<(bool, bool, String), ()> {
        if node.is_null() {
            return Ok((false, false, String::new()));
        }
        if node.kind != Kind::Mapping {
            self.type_error(node, "actionlint.actionInputMetadata");
            return Err(());
        }
        let before = self.errors.len();
        let mut required = false;
        let mut has_default = false;
        let mut message = String::new();
        for (key, value) in node.pairs() {
            match key.value.as_str() {
                "required" => required = self.boolean(value),
                "default" => {
                    if value.kind != Kind::Scalar {
                        self.type_error(value, "string");
                    }
                    has_default = !value.is_null();
                }
                "deprecationMessage" => message = self.string(value),
                _ => {}
            }
        }
        if self.errors.len() > before {
            return Err(());
        }
        Ok((required, has_default, message))
    }

    fn inputs(&mut self, node: &Node) -> BTreeMap<String, ActionInput> {
        let mut inputs = BTreeMap::new();
        if node.is_null() || !self.mapping_or_error(node, "inputs") {
            return inputs;
        }
        let mut unexpected = None;
        for (key, value) in node.pairs() {
            let Ok((required, has_default, message)) = self.input(value) else {
                return inputs;
            };
            let id = key.value.to_lowercase();
            if inputs.contains_key(&id) {
                self.custom(node, format!("input {} is duplicated", quote(&key.value)));
                return inputs;
            }
            let mut deprecated = false;
            if value.kind == Kind::Mapping {
                for (field, _) in value.pairs() {
                    match field.value.as_str() {
                        "deprecationMessage" => deprecated = true,
                        "description" | "required" | "default" => {}
                        other => {
                            unexpected = Some(format!(
                                "unexpected key {} for definition of input {}",
                                quote(other),
                                quote(&key.value)
                            ));
                        }
                    }
                }
            }
            inputs.insert(
                id,
                ActionInput {
                    name: key.value.clone(),
                    required: required && !has_default,
                    deprecated,
                    deprecation_message: message.trim().to_owned(),
                },
            );
        }
        if let Some(message) = unexpected {
            self.custom(node, message);
        }
        inputs
    }

    fn outputs(&mut self, node: &Node) -> BTreeMap<String, String> {
        let mut outputs = BTreeMap::new();
        if node.is_null() || !self.mapping_or_error(node, "outputs") {
            return outputs;
        }
        for (key, _) in node.pairs() {
            let id = key.value.to_lowercase();
            if outputs.contains_key(&id) {
                self.custom(node, format!("output {} is duplicated", quote(&key.value)));
                return outputs;
            }
            outputs.insert(id, key.value.clone());
        }
        outputs
    }

    fn runs(&mut self, node: &Node) -> ActionRuns {
        let mut runs = ActionRuns::default();
        if !self.present(node, Kind::Mapping, "actionlint.ActionMetadataRuns") {
            return runs;
        }
        for (key, value) in node.pairs() {
            match key.value.as_str() {
                "using" => runs.using = self.string(value),
                "main" => runs.main = self.string(value),
                "pre" => runs.pre = self.string(value),
                "pre-if" => runs.pre_if = self.string(value),
                "post" => runs.post = self.string(value),
                "post-if" => runs.post_if = self.string(value),
                "image" => runs.image = self.string(value),
                "pre-entrypoint" => runs.pre_entrypoint = self.string(value),
                "entrypoint" => runs.entrypoint = self.string(value),
                "post-entrypoint" => runs.post_entrypoint = self.string(value),
                "steps" => {
                    runs.steps = self
                        .present(value, Kind::Sequence, "[]interface {}")
                        .then_some(value.content.len());
                }
                "args" => runs.args = self.present(value, Kind::Sequence, "[]interface {}"),
                "env" => {
                    runs.env = self.present(value, Kind::Mapping, "map[string]interface {}");
                }
                _ => {}
            }
        }
        runs
    }

    fn branding(&mut self, node: &Node) -> Branding {
        let mut branding = Branding::default();
        if !self.present(node, Kind::Mapping, "actionlint.ActionMetadataBranding") {
            return branding;
        }
        for (key, value) in node.pairs() {
            match key.value.as_str() {
                "icon" => branding.icon = self.string(value),
                "color" => branding.color = self.string(value),
                _ => {}
            }
        }
        branding
    }

    fn metadata(&mut self, node: &Node) -> ActionMetadata {
        let mut metadata = ActionMetadata::default();
        if !self.present(node, Kind::Mapping, "actionlint.ActionMetadata") {
            return metadata;
        }
        for (key, value) in node.pairs() {
            match key.value.as_str() {
                "name" => metadata.name = self.string(value),
                "description" => metadata.description = self.string(value),
                "inputs" => metadata.inputs = self.inputs(value),
                "outputs" => metadata.outputs = self.outputs(value),
                "runs" => metadata.runs = self.runs(value),
                "branding" => metadata.branding = self.branding(value),
                _ => {}
            }
        }
        metadata
    }
}

pub fn decode(source: &str) -> Result<ActionMetadata, String> {
    let loaded = load(source);
    if let Some(error) = loaded.errors.first() {
        return Err(format!("yaml: line {}: {}", error.pos.line, error.message));
    }
    let Some(root) = loaded.root else {
        return Ok(ActionMetadata::default());
    };
    let mut decoder = Decoder { errors: Vec::new() };
    let metadata = decoder.metadata(&root);
    match decoder.errors.as_slice() {
        [] => Ok(metadata),
        [one] => Err(one.clone()),
        many => Err(format!("yaml: unmarshal errors:  {}", many.join("  "))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decodes_inputs_like_go_yaml() {
        let metadata = decode(
            "name: a\ninputs:\n  Foo:\n    required: yes\n  bar:\n    required: true\n    default: x\n    deprecationMessage: ' old. '\n",
        )
        .expect("valid metadata");
        assert!(metadata.inputs["foo"].required);
        assert!(!metadata.inputs["bar"].required);
        assert!(metadata.inputs["bar"].deprecated);
        assert_eq!(metadata.inputs["bar"].deprecation_message, "old.");
    }

    #[test]
    fn reports_go_like_errors() {
        assert_eq!(
            decode("outputs: oops\n").err().as_deref(),
            Some(
                "line 1: yaml: outputs must be mapping node but scalar node was found at line:1, col:10"
            )
        );
        assert_eq!(
            decode("inputs:\n  a: {}\n  A: {}\n").err().as_deref(),
            Some("line 2: input \"A\" is duplicated")
        );
        assert!(
            decode("inputs: x\noutputs: y\n")
                .err()
                .is_some_and(|e| e.starts_with("yaml: unmarshal errors:  line 1: yaml: "))
        );
    }
}
