use std::collections::BTreeMap;
use std::sync::OnceLock;

use super::ast::{Expr, ExprError, Token};
use crate::shared::text::{quote, sorted_quotes};

const ADVICE: &str = "see https://docs.github.com/en/actions/reference/security/secure-use#good-practices-for-mitigating-script-injection-attacks for more details";

struct InputNode {
    name: &'static str,
    parent: Option<usize>,
    children: BTreeMap<&'static str, usize>,
}

struct InputTree {
    nodes: Vec<InputNode>,
    roots: BTreeMap<&'static str, usize>,
}

enum Spec {
    Leaf(&'static str),
    Branch(&'static str, Vec<Spec>),
}

use Spec::{Branch, Leaf};

impl InputTree {
    fn add(&mut self, spec: &Spec, parent: Option<usize>) -> usize {
        let (name, children) = match spec {
            Leaf(name) => (*name, &[][..]),
            Branch(name, children) => (*name, children.as_slice()),
        };
        let id = self.nodes.len();
        self.nodes.push(InputNode {
            name,
            parent,
            children: BTreeMap::new(),
        });
        for child in children {
            let child_id = self.add(child, Some(id));
            let child_name = self.nodes[child_id].name;
            self.nodes[id].children.insert(child_name, child_id);
        }
        id
    }

    fn path(&self, id: usize) -> String {
        let node = &self.nodes[id];
        match node.parent {
            Some(parent) => format!("{}.{}", self.path(parent), node.name),
            None => node.name.to_owned(),
        }
    }

    fn child(&self, id: usize, name: &str) -> Option<usize> {
        self.nodes[id].children.get(name).copied()
    }

    fn is_leaf(&self, id: usize) -> bool {
        self.nodes[id].children.is_empty()
    }
}

fn author() -> Spec {
    Branch("author", vec![Leaf("email"), Leaf("name")])
}

fn builtin() -> &'static InputTree {
    static TREE: OnceLock<InputTree> = OnceLock::new();
    TREE.get_or_init(|| {
        let github = Branch(
            "github",
            vec![
                Branch(
                    "event",
                    vec![
                        Branch("issue", vec![Leaf("title"), Leaf("body")]),
                        Branch(
                            "pull_request",
                            vec![
                                Leaf("title"),
                                Leaf("body"),
                                Branch(
                                    "head",
                                    vec![
                                        Leaf("ref"),
                                        Leaf("label"),
                                        Branch("repo", vec![Leaf("default_branch")]),
                                    ],
                                ),
                            ],
                        ),
                        Branch("comment", vec![Leaf("body")]),
                        Branch("review", vec![Leaf("body")]),
                        Branch("review_comment", vec![Leaf("body")]),
                        Branch("pages", vec![Branch("*", vec![Leaf("page_name")])]),
                        Branch(
                            "commits",
                            vec![Branch("*", vec![Leaf("message"), author()])],
                        ),
                        Branch("head_commit", vec![Leaf("message"), author()]),
                        Branch("discussion", vec![Leaf("title"), Leaf("body")]),
                    ],
                ),
                Leaf("head_ref"),
            ],
        );
        let mut tree = InputTree {
            nodes: Vec::new(),
            roots: BTreeMap::new(),
        };
        let root = tree.add(&github, None);
        tree.roots.insert("github", root);
        tree
    })
}

fn is_safe_call(expr: &Expr) -> bool {
    match expr {
        Expr::Call { callee, .. } => {
            let callee = callee.to_ascii_lowercase();
            callee == "contains" || callee == "startswith" || callee == "endswith"
        }
        _ => false,
    }
}

pub struct Untrusted {
    tree: &'static InputTree,
    filtering_object: bool,
    cur: Vec<usize>,
    start: Option<Token>,
    errors: Vec<ExprError>,
    safe_calls: usize,
}

impl Default for Untrusted {
    fn default() -> Self {
        Self::new()
    }
}

impl Untrusted {
    #[must_use]
    pub fn new() -> Self {
        Self {
            tree: builtin(),
            filtering_object: false,
            cur: Vec::new(),
            start: None,
            errors: Vec::new(),
            safe_calls: 0,
        }
    }

    fn reset(&mut self) {
        self.start = None;
        self.filtering_object = false;
        self.cur.clear();
    }

    pub fn init(&mut self) {
        self.errors.clear();
        self.safe_calls = 0;
        self.reset();
    }

    fn on_var(&mut self, name: &str, token: &Token) {
        if let Some(root) = self.tree.roots.get(name) {
            self.start = Some(token.clone());
            self.cur.push(*root);
        }
    }

    fn on_prop_access(&mut self, name: &str) {
        let tree = self.tree;
        self.cur = self
            .cur
            .iter()
            .filter_map(|id| tree.child(*id, name))
            .collect();
    }

    fn on_index_access(&mut self) {
        if self.filtering_object {
            self.filtering_object = false;
            return;
        }
        self.on_prop_access("*");
    }

    fn on_object_filter(&mut self) {
        self.filtering_object = true;
        let tree = self.tree;
        let mut next = Vec::new();
        for id in &self.cur {
            if let Some(elem) = tree.child(*id, "*") {
                next.push(elem);
                continue;
            }
            next.extend(tree.nodes[*id].children.values().copied());
        }
        self.cur = next;
    }

    fn end(&mut self) {
        let inputs: Vec<String> = self
            .cur
            .iter()
            .filter(|id| self.tree.is_leaf(**id))
            .map(|id| self.tree.path(*id))
            .collect();
        if let Some(start) = &self.start {
            match inputs.as_slice() {
                [] => {}
                [input] => self.errors.push(ExprError::at(
                    start,
                    format!(
                        "{} is potentially untrusted. avoid using it directly in inline scripts. instead, pass it through an environment variable. {ADVICE}",
                        quote(input)
                    ),
                )),
                many => self.errors.push(ExprError::at(
                    start,
                    format!(
                        "object filter extracts potentially untrusted properties {}. avoid using the value directly in inline scripts. instead, pass the value through an environment variable. {ADVICE}",
                        sorted_quotes(many)
                    ),
                )),
            }
        }
        self.reset();
    }

    pub fn enter(&mut self, expr: &Expr) {
        if is_safe_call(expr) {
            self.safe_calls += 1;
        }
    }

    pub fn leave(&mut self, expr: &Expr) {
        if self.safe_calls > 0 {
            if is_safe_call(expr) {
                self.safe_calls -= 1;
            }
            return;
        }
        match expr {
            Expr::Variable { name, token } => {
                self.end();
                self.on_var(name, token);
            }
            Expr::ObjectDeref { property, .. } => self.on_prop_access(property),
            Expr::Index { index, .. } => match index.as_ref() {
                Expr::Str { value, .. } => self.on_prop_access(value),
                _ => self.on_index_access(),
            },
            Expr::ArrayDeref { .. } => self.on_object_filter(),
            _ => self.end(),
        }
    }

    pub fn finish(&mut self) {
        self.end();
    }

    pub fn take_errors(&mut self) -> Vec<ExprError> {
        std::mem::take(&mut self.errors)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::expression::lexer::Lexer;
    use crate::shared::expression::parser::parse;

    fn walk<'a>(expr: &'a Expr, f: &mut dyn FnMut(&'a Expr, bool)) {
        f(expr, true);
        match expr {
            Expr::ObjectDeref { receiver, .. } | Expr::ArrayDeref { receiver } => walk(receiver, f),
            Expr::Index { operand, index } => {
                walk(index, f);
                walk(operand, f);
            }
            Expr::Not { operand, .. } => walk(operand, f),
            Expr::Compare { left, right, .. } | Expr::Logical { left, right, .. } => {
                walk(left, f);
                walk(right, f);
            }
            Expr::Call { args, .. } => {
                for arg in args {
                    walk(arg, f);
                }
            }
            _ => {}
        }
        f(expr, false);
    }

    fn errors_of(source: &str) -> Vec<String> {
        let mut lexer = Lexer::new(source);
        let expr = parse(&mut lexer).unwrap_or_else(|e| panic!("{}", e.message));
        let mut checker = Untrusted::new();
        checker.init();
        walk(&expr, &mut |node, entering| {
            if entering {
                checker.enter(node);
            } else {
                checker.leave(node);
            }
        });
        checker.finish();
        checker
            .take_errors()
            .into_iter()
            .map(|e| e.message)
            .collect()
    }

    #[test]
    fn detects_direct_access() {
        let errors = errors_of("github.event.issue.title }}");
        assert_eq!(errors.len(), 1);
        assert!(errors[0].starts_with("\"github.event.issue.title\" is potentially untrusted"));
    }

    #[test]
    fn detects_array_and_filter_access() {
        assert_eq!(errors_of("github.event.commits[0].message }}").len(), 1);
        let filtered = errors_of("github.event.commits.*.author }}");
        assert_eq!(filtered, Vec::<String>::new());
        let many = errors_of("github.event.commits.*.author.* }}");
        assert_eq!(many.len(), 1);
        assert!(many[0].contains(
            "\"github.event.commits.*.author.email\", \"github.event.commits.*.author.name\""
        ));
    }

    #[test]
    fn ignores_safe_calls() {
        assert_eq!(
            errors_of("contains(github.event.issue.title, 'x') }}"),
            Vec::<String>::new()
        );
        assert_eq!(
            errors_of("github.event.issue.number }}"),
            Vec::<String>::new()
        );
    }
}
