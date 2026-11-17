use super::{Kind, Node};

#[derive(Default)]
pub struct Decoder {
    pub errors: Vec<String>,
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
    pub fn type_error(&mut self, node: &Node, target: &str) {
        self.errors.push(format!(
            "line {}: cannot unmarshal {} into {target}",
            node.pos.line,
            shown(node)
        ));
    }

    pub fn custom(&mut self, node: &Node, message: String) {
        self.errors
            .push(format!("line {}: {message}", node.pos.line));
    }

    pub fn string(&mut self, node: &Node) -> String {
        match node.kind {
            Kind::Scalar if node.is_null() => String::new(),
            Kind::Scalar => node.value.clone(),
            _ => {
                self.type_error(node, "string");
                String::new()
            }
        }
    }

    pub fn boolean(&mut self, node: &Node) -> bool {
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

    pub fn present(&mut self, node: &Node, kind: Kind, target: &str) -> bool {
        if node.is_null() {
            return false;
        }
        if node.kind != kind {
            self.type_error(node, target);
            return false;
        }
        true
    }

    pub fn mapping_or_error(&mut self, node: &Node, where_: &str) -> bool {
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

    pub fn optional_string(&mut self, node: &Node) -> Option<String> {
        if node.is_null() {
            return None;
        }
        Some(self.string(node))
    }
}
