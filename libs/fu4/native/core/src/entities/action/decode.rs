use std::collections::BTreeMap;

use super::{ActionInput, ActionMetadata, ActionRuns, Branding};
use crate::shared::text::quote;
use crate::shared::yaml::{Decoder, Kind, Node, load};

fn input(d: &mut Decoder, node: &Node) -> Result<(bool, bool, String), ()> {
    if node.is_null() {
        return Ok((false, false, String::new()));
    }
    if node.kind != Kind::Mapping {
        d.type_error(node, "actionlint.actionInputMetadata");
        return Err(());
    }
    let before = d.errors.len();
    let mut required = false;
    let mut has_default = false;
    let mut message = String::new();
    for (key, value) in node.pairs() {
        match key.value.as_str() {
            "required" => required = d.boolean(value),
            "default" => {
                if value.kind != Kind::Scalar {
                    d.type_error(value, "string");
                }
                has_default = !value.is_null();
            }
            "deprecationMessage" => message = d.string(value),
            _ => {}
        }
    }
    if d.errors.len() > before {
        return Err(());
    }
    Ok((required, has_default, message))
}

fn inputs(d: &mut Decoder, node: &Node) -> BTreeMap<String, ActionInput> {
    let mut inputs = BTreeMap::new();
    if node.is_null() || !d.mapping_or_error(node, "inputs") {
        return inputs;
    }
    let mut unexpected = None;
    for (key, value) in node.pairs() {
        let Ok((required, has_default, message)) = input(d, value) else {
            return inputs;
        };
        let id = key.value.to_lowercase();
        if inputs.contains_key(&id) {
            d.custom(node, &format!("input {} is duplicated", quote(&key.value)));
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
        d.custom(node, &message);
    }
    inputs
}

fn outputs(d: &mut Decoder, node: &Node) -> BTreeMap<String, String> {
    let mut outputs = BTreeMap::new();
    if node.is_null() || !d.mapping_or_error(node, "outputs") {
        return outputs;
    }
    for (key, _) in node.pairs() {
        let id = key.value.to_lowercase();
        if outputs.contains_key(&id) {
            d.custom(node, &format!("output {} is duplicated", quote(&key.value)));
            return outputs;
        }
        outputs.insert(id, key.value.clone());
    }
    outputs
}

fn runs(d: &mut Decoder, node: &Node) -> ActionRuns {
    let mut runs = ActionRuns::default();
    if !d.present(node, Kind::Mapping, "actionlint.ActionMetadataRuns") {
        return runs;
    }
    for (key, value) in node.pairs() {
        match key.value.as_str() {
            "using" => runs.using = d.string(value),
            "main" => runs.main = d.string(value),
            "pre" => runs.pre = d.string(value),
            "pre-if" => runs.pre_if = d.string(value),
            "post" => runs.post = d.string(value),
            "post-if" => runs.post_if = d.string(value),
            "image" => runs.image = d.string(value),
            "pre-entrypoint" => runs.pre_entrypoint = d.string(value),
            "entrypoint" => runs.entrypoint = d.string(value),
            "post-entrypoint" => runs.post_entrypoint = d.string(value),
            "steps" => {
                runs.steps = d
                    .present(value, Kind::Sequence, "[]interface {}")
                    .then_some(value.content.len());
            }
            "args" => runs.args = d.present(value, Kind::Sequence, "[]interface {}"),
            "env" => {
                runs.env = d.present(value, Kind::Mapping, "map[string]interface {}");
            }
            _ => {}
        }
    }
    runs
}

fn branding(d: &mut Decoder, node: &Node) -> Branding {
    let mut branding = Branding::default();
    if !d.present(node, Kind::Mapping, "actionlint.ActionMetadataBranding") {
        return branding;
    }
    for (key, value) in node.pairs() {
        match key.value.as_str() {
            "icon" => branding.icon = d.string(value),
            "color" => branding.color = d.string(value),
            _ => {}
        }
    }
    branding
}

fn metadata(d: &mut Decoder, node: &Node) -> ActionMetadata {
    let mut metadata = ActionMetadata::default();
    if !d.present(node, Kind::Mapping, "actionlint.ActionMetadata") {
        return metadata;
    }
    for (key, value) in node.pairs() {
        match key.value.as_str() {
            "name" => metadata.name = d.string(value),
            "description" => metadata.description = d.string(value),
            "inputs" => metadata.inputs = inputs(d, value),
            "outputs" => metadata.outputs = outputs(d, value),
            "runs" => metadata.runs = runs(d, value),
            "branding" => metadata.branding = branding(d, value),
            _ => {}
        }
    }
    metadata
}

pub fn decode(source: &str) -> Result<ActionMetadata, String> {
    let loaded = load(source);
    if let Some(error) = loaded.errors.first() {
        return Err(format!("yaml: line {}: {}", error.pos.line, error.message));
    }
    let Some(root) = loaded.root else {
        return Ok(ActionMetadata::default());
    };
    let mut decoder = Decoder::default();
    let metadata = metadata(&mut decoder, &root);
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
