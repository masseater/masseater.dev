use std::collections::HashSet;

use tree_sitter::{Node, Parser};

const TAB_WIDTH: usize = 8;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum Code {
    UnquotedExpansion,
    UnquotedSubstitution,
    UnquotedArray,
    UselessEcho,
    Backticks,
    UselessCat,
    ArithmeticDollar,
    LocalOutsideFunction,
    SpacedAssignment,
    UnquotedArrayElement,
    UnusedVariable,
    TrailingDot,
}

impl Code {
    #[must_use]
    pub fn number(self) -> u32 {
        match self {
            Code::UnquotedExpansion => 2086,
            Code::UnquotedSubstitution => 2046,
            Code::UnquotedArray => 2068,
            Code::UselessEcho => 2005,
            Code::Backticks => 2006,
            Code::UselessCat => 2002,
            Code::ArithmeticDollar => 2004,
            Code::LocalOutsideFunction => 2168,
            Code::SpacedAssignment => 2283,
            Code::UnquotedArrayElement => 2206,
            Code::UnusedVariable => 2034,
            Code::TrailingDot => 2288,
        }
    }

    #[must_use]
    pub fn level(self) -> &'static str {
        match self {
            Code::UnquotedExpansion => "info",
            Code::UnquotedSubstitution
            | Code::UnquotedArrayElement
            | Code::UnusedVariable
            | Code::TrailingDot => "warning",
            Code::UselessEcho | Code::Backticks | Code::UselessCat | Code::ArithmeticDollar => {
                "style"
            }
            Code::UnquotedArray | Code::LocalOutsideFunction | Code::SpacedAssignment => "error",
        }
    }

    #[must_use]
    pub fn message(self) -> &'static str {
        match self {
            Code::UnusedVariable => "appears unused. Verify use (or export if used externally)",
            Code::TrailingDot => {
                "This is interpreted as a command name ending with '.'. Double check syntax"
            }
            Code::UnquotedExpansion => "Double quote to prevent globbing and word splitting",
            Code::UnquotedSubstitution => "Quote this to prevent word splitting",
            Code::UnquotedArray => "Double quote array expansions to avoid re-splitting elements",
            Code::UselessEcho => "Useless echo? Instead of 'echo $(cmd)', just use 'cmd'",
            Code::Backticks => "Use $(...) notation instead of legacy backticks `...`",
            Code::UselessCat => {
                "Useless cat. Consider 'cmd < file | ..' or 'cmd file | ..' instead"
            }
            Code::ArithmeticDollar => "$/${} is unnecessary on arithmetic variables",
            Code::LocalOutsideFunction => "'local' is only valid in functions",
            Code::SpacedAssignment => {
                "Remove spaces around = to assign (or use [ ] to compare, or quote '=' if literal)"
            }
            Code::UnquotedArrayElement => {
                "Quote to prevent word splitting/globbing, or split robustly with mapfile or read -a"
            }
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Finding {
    pub code: Code,
    pub line: usize,
    pub column: usize,
    pub subject: String,
}

impl Finding {
    #[must_use]
    pub fn message(&self) -> String {
        if self.subject.is_empty() {
            self.code.message().to_owned()
        } else {
            format!("{} {}", self.subject, self.code.message())
        }
    }
}

enum Context {
    Word,
    Array,
    Arithmetic,
    Quiet,
}

struct Checker<'a> {
    source: &'a str,
    findings: Vec<Finding>,
    assigned: Vec<Finding>,
    used: HashSet<String>,
}

fn context_of(node: Node<'_>, source: &str) -> Context {
    let mut current = node;
    while let Some(parent) = current.parent() {
        match parent.kind() {
            "string"
            | "heredoc_body"
            | "variable_assignments"
            | "declaration_command"
            | "case_statement"
            | "for_statement"
            | "subscript"
            | "expansion" => {
                return Context::Quiet;
            }
            "arithmetic_expansion" => return Context::Arithmetic,
            "array" => return Context::Array,
            "variable_assignment" => return Context::Quiet,
            "test_command" => {
                return if text(parent, source).starts_with("[[") {
                    Context::Quiet
                } else {
                    Context::Word
                };
            }
            "command" | "file_redirect" | "herestring_redirect" => return Context::Word,
            _ => current = parent,
        }
    }
    Context::Quiet
}

fn text<'s>(node: Node<'_>, source: &'s str) -> &'s str {
    &source[node.byte_range()]
}

fn is_numeric(expansion: &str) -> bool {
    matches!(expansion, "$#" | "$?" | "$$" | "$!" | "$-") || expansion.starts_with("${#")
}

fn is_array(expansion: &str) -> bool {
    expansion == "$@" || expansion.ends_with("[@]}")
}

impl Checker<'_> {
    fn report(&mut self, node: Node<'_>, code: Code) {
        let finding = self.finding(node, code, String::new());
        self.findings.push(finding);
    }

    fn finding(&self, node: Node<'_>, code: Code, subject: String) -> Finding {
        let start = node.start_position();
        let line_start = self.source[..node.start_byte()]
            .rfind('\n')
            .map_or(0, |index| index + 1);
        let column = self.source[line_start..node.start_byte()]
            .chars()
            .fold(0, |column, c| {
                if c == '\t' {
                    column + TAB_WIDTH - column % TAB_WIDTH
                } else {
                    column + 1
                }
            });
        Finding {
            code,
            line: start.row + 1,
            column: column + 1,
            subject,
        }
    }

    fn assignment(&mut self, node: Node<'_>) {
        let exported = node.parent().is_some_and(|parent| {
            parent.kind() == "command"
                || (parent.kind() == "declaration_command"
                    && !text(parent, self.source).starts_with("local"))
        });
        if exported {
            return;
        }
        let Some(name) = node.child_by_field_name("name") else {
            return;
        };
        let name = match name.kind() {
            "subscript" => name.child_by_field_name("name").unwrap_or(name),
            _ => name,
        };
        let name = text(name, self.source).to_owned();
        if name.starts_with('_') {
            return;
        }
        let finding = self.finding(node, Code::UnusedVariable, name);
        self.assigned.push(finding);
    }

    fn use_name(&mut self, node: Node<'_>) {
        let is_assigned = node.parent().is_some_and(|parent| {
            matches!(parent.kind(), "variable_assignment" | "subscript")
                && parent.child_by_field_name("name") == Some(node)
                && (parent.kind() == "variable_assignment"
                    || parent
                        .parent()
                        .is_some_and(|grand| grand.kind() == "variable_assignment"))
        });
        if !is_assigned {
            self.used.insert(text(node, self.source).to_owned());
        }
    }

    fn expansion(&mut self, node: Node<'_>) {
        let source = text(node, self.source);
        match context_of(node, self.source) {
            Context::Word if is_array(source) => self.report(node, Code::UnquotedArray),
            Context::Word if !is_numeric(source) => self.report(node, Code::UnquotedExpansion),
            Context::Array => self.report(node, Code::UnquotedArrayElement),
            Context::Arithmetic if node.kind() == "simple_expansion" && !is_numeric(source) => {
                self.report(node, Code::ArithmeticDollar);
            }
            _ => {}
        }
    }

    fn substitution(&mut self, node: Node<'_>) {
        if matches!(context_of(node, self.source), Context::Word) {
            self.report(node, Code::UnquotedSubstitution);
        }
        if text(node, self.source).starts_with('`') {
            self.report(node, Code::Backticks);
        }
    }

    fn command(&mut self, node: Node<'_>) {
        let name = node
            .child_by_field_name("name")
            .map(|name| text(name, self.source));
        let mut cursor = node.walk();
        let arguments: Vec<Node<'_>> = node
            .children_by_field_name("argument", &mut cursor)
            .collect();
        if let Some(command_name) = node.child_by_field_name("name")
            && command_name
                .named_child(0)
                .is_some_and(|word| word.kind() == "word")
            && name.is_some_and(|name| name.len() > 1 && name.ends_with('.'))
        {
            self.report(command_name, Code::TrailingDot);
        }
        if let (Some(name), [first, ..]) = (name, arguments.as_slice())
            && text(*first, self.source) == "="
            && first.kind() == "word"
            && !matches!(name, "test" | "expr")
        {
            self.report(*first, Code::SpacedAssignment);
        }
        if name == Some("echo")
            && let [only] = arguments.as_slice()
        {
            let substituted = match only.kind() {
                "command_substitution" => true,
                "string" => {
                    only.named_child_count() == 1
                        && only
                            .named_child(0)
                            .is_some_and(|child| child.kind() == "command_substitution")
                        && text(*only, self.source).len()
                            == only
                                .named_child(0)
                                .map_or(0, |child| child.byte_range().len())
                                + 2
                }
                _ => false,
            };
            if substituted {
                self.report(*only, Code::UselessEcho);
            }
        }
        if name == Some("cat")
            && let [only] = arguments.as_slice()
            && only.kind() == "word"
            && !text(*only, self.source).starts_with('-')
            && node.parent().is_some_and(|parent| {
                parent.kind() == "pipeline" && parent.named_child(0) == Some(node)
            })
        {
            self.report(*only, Code::UselessCat);
        }
    }

    fn declaration(&mut self, node: Node<'_>) {
        if !text(node, self.source).starts_with("local") {
            return;
        }
        let mut current = node;
        while let Some(parent) = current.parent() {
            if parent.kind() == "function_definition" {
                return;
            }
            current = parent;
        }
        self.report(node, Code::LocalOutsideFunction);
    }

    fn visit(&mut self, node: Node<'_>) {
        match node.kind() {
            "simple_expansion" | "expansion" => self.expansion(node),
            "command_substitution" => self.substitution(node),
            "command" => self.command(node),
            "declaration_command" => self.declaration(node),
            "variable_assignment" => self.assignment(node),
            "variable_name" => self.use_name(node),
            _ => {}
        }
        let mut cursor = node.walk();
        for child in node.named_children(&mut cursor) {
            self.visit(child);
        }
    }
}

#[cfg(test)]
mod conformance;

#[must_use]
pub fn check(source: &str) -> Vec<Finding> {
    let mut parser = Parser::new();
    if parser
        .set_language(&tree_sitter_bash::LANGUAGE.into())
        .is_err()
    {
        return Vec::new();
    }
    let Some(tree) = parser.parse(source, None) else {
        return Vec::new();
    };
    if tree.root_node().has_error() {
        return Vec::new();
    }
    let mut checker = Checker {
        source,
        findings: Vec::new(),
        assigned: Vec::new(),
        used: HashSet::new(),
    };
    checker.visit(tree.root_node());
    let unused: Vec<Finding> = checker
        .assigned
        .drain(..)
        .filter(|finding| !checker.used.contains(&finding.subject))
        .collect();
    checker.findings.extend(unused);
    checker
        .findings
        .sort_by_key(|finding| (finding.line, finding.column, finding.code));
    checker.findings
}
