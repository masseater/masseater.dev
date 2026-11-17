use std::collections::BTreeMap;

use super::{CallInput, CallSecret, ReusableMetadata};
use crate::shared::expression::types::ExprType;
use crate::shared::yaml::{Decoder, Kind, Node, load};

fn input(d: &mut Decoder, name: &str, node: &Node) -> Option<CallInput> {
    let mut input = CallInput {
        name: name.to_owned(),
        required: false,
        ty: ExprType::Any,
    };
    if node.is_null() {
        return Some(input);
    }
    if node.kind != Kind::Mapping {
        d.type_error(node, "actionlint.metadata");
        return None;
    }
    let before = d.errors.len();
    let mut required = false;
    let mut has_default = false;
    let mut ty = String::new();
    for (key, value) in node.pairs() {
        match key.value.as_str() {
            "required" => required = d.boolean(value),
            "default" => has_default = d.optional_string(value).is_some(),
            "type" => ty = d.string(value),
            _ => {}
        }
    }
    if d.errors.len() > before {
        return None;
    }
    input.required = required && !has_default;
    input.ty = match ty.as_str() {
        "boolean" => ExprType::Bool,
        "number" => ExprType::Number,
        "string" => ExprType::String,
        _ => ExprType::Any,
    };
    Some(input)
}

fn inputs(d: &mut Decoder, node: &Node) -> BTreeMap<String, CallInput> {
    let mut out = BTreeMap::new();
    if node.is_null() || !d.mapping_or_error(node, "on.workflow_call.inputs") {
        return out;
    }
    for (key, value) in node.pairs() {
        let Some(input) = input(d, &key.value, value) else {
            return out;
        };
        out.insert(key.value.to_lowercase(), input);
    }
    out
}

fn secrets(d: &mut Decoder, node: &Node) -> BTreeMap<String, CallSecret> {
    let mut out = BTreeMap::new();
    if node.is_null() || !d.mapping_or_error(node, "on.workflow_call.secrets") {
        return out;
    }
    for (key, value) in node.pairs() {
        let mut required = false;
        if d.present(
            value,
            Kind::Mapping,
            "actionlint.ReusableWorkflowMetadataSecret",
        ) {
            let before = d.errors.len();
            for (field, field_value) in value.pairs() {
                if field.value == "required" {
                    required = d.boolean(field_value);
                }
            }
            if d.errors.len() > before {
                return out;
            }
        } else if !value.is_null() {
            return out;
        }
        out.insert(
            key.value.to_lowercase(),
            CallSecret {
                name: key.value.clone(),
                required,
            },
        );
    }
    out
}

fn outputs(d: &mut Decoder, node: &Node) -> BTreeMap<String, String> {
    if node.is_null() || !d.mapping_or_error(node, "on.workflow_call.outputs") {
        return BTreeMap::new();
    }
    node.pairs()
        .map(|(key, _)| (key.value.to_lowercase(), key.value.clone()))
        .collect()
}

fn metadata(d: &mut Decoder, node: &Node) -> ReusableMetadata {
    let mut metadata = ReusableMetadata::default();
    if !d.present(node, Kind::Mapping, "actionlint.ReusableWorkflowMetadata") {
        return metadata;
    }
    for (key, value) in node.pairs() {
        match key.value.as_str() {
            "inputs" => metadata.inputs = inputs(d, value),
            "outputs" => metadata.outputs = outputs(d, value),
            "secrets" => metadata.secrets = secrets(d, value),
            _ => {}
        }
    }
    metadata
}

fn finish(d: Decoder, metadata: ReusableMetadata) -> Result<ReusableMetadata, String> {
    if d.errors.is_empty() {
        return Ok(metadata);
    }
    Err(format!(
        "yaml: unmarshal errors:\n  {}",
        d.errors.join("\n  ")
    ))
}

pub fn decode(source: &str) -> Result<ReusableMetadata, String> {
    let loaded = load(source);
    if let Some(error) = loaded.errors.first() {
        return Err(format!("yaml: line {}: {}", error.pos.line, error.message));
    }
    let on = loaded
        .root
        .as_ref()
        .filter(|root| root.kind == Kind::Mapping)
        .and_then(|root| root.get("on"))
        .ok_or_else(|| "\"on:\" is not found".to_owned())?;
    let is_call = |node: &Node| node.value.to_lowercase() == "workflow_call";
    match on.kind {
        Kind::Mapping => {
            if let Some((_, value)) = on.pairs().find(|(key, _)| is_call(key)) {
                let mut d = Decoder::default();
                let metadata = metadata(&mut d, value);
                return finish(d, metadata);
            }
        }
        Kind::Scalar if is_call(on) => return Ok(ReusableMetadata::default()),
        Kind::Sequence if on.content.iter().any(|n| is_call(n)) => {
            return Ok(ReusableMetadata::default());
        }
        _ => {}
    }
    Err(format!(
        "\"workflow_call\" event trigger is not found in \"on:\" at line:{}, column:{}",
        on.pos.line, on.pos.col
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decodes_workflow_call_metadata() {
        let metadata = decode(
            "on:\n  workflow_call:\n    inputs:\n      Foo:\n        type: number\n        required: true\n    secrets:\n      s:\n",
        )
        .expect("valid");
        assert_eq!(metadata.inputs["foo"].ty, ExprType::Number);
        assert!(metadata.inputs["foo"].required);
        assert!(!metadata.secrets["s"].required);
        assert_eq!(
            decode("jobs: {}\n").err().as_deref(),
            Some("\"on:\" is not found")
        );
        assert!(
            decode("on:\n  workflow_call:\n    outputs: x\n")
                .is_err_and(|e| e.contains("on.workflow_call.outputs must be mapping node"))
        );
    }
}
