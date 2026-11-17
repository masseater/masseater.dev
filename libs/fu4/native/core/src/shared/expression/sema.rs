use std::collections::{BTreeMap, BTreeSet};
use std::sync::OnceLock;

use super::ast::{CompareOp, Expr, ExprError, LogicalOp};
use super::availability::table;
use super::json;
use super::types::{ArrayType, ExprType, ObjectType};
use super::untrusted::Untrusted;
use crate::shared::text::{ordinal, quote, quotes, sorted_quotes};

pub struct Signature {
    pub name: &'static str,
    pub ret: ExprType,
    pub params: Vec<ExprType>,
    pub variadic: bool,
    pub constant: bool,
}

impl Signature {
    fn describe(&self) -> String {
        let params: Vec<String> = self.params.iter().map(ExprType::describe).collect();
        let dots = if self.variadic { "..." } else { "" };
        format!(
            "{}({}{dots}) -> {}",
            self.name,
            params.join(", "),
            self.ret.describe()
        )
    }
}

fn signature(
    name: &'static str,
    ret: ExprType,
    params: Vec<ExprType>,
    variadic: bool,
    constant: bool,
) -> Signature {
    Signature {
        name,
        ret,
        params,
        variadic,
        constant,
    }
}

pub fn functions() -> &'static BTreeMap<&'static str, Vec<Signature>> {
    static FUNCTIONS: OnceLock<BTreeMap<&'static str, Vec<Signature>>> = OnceLock::new();
    FUNCTIONS.get_or_init(|| {
        use ExprType::{Any, Bool, String as Str};
        let strings = || ExprType::array(Str);
        BTreeMap::from([
            (
                "contains",
                vec![
                    signature("contains", Bool, vec![Str, Str], false, true),
                    signature(
                        "contains",
                        Bool,
                        vec![ExprType::array(Any), Any],
                        false,
                        true,
                    ),
                ],
            ),
            (
                "startswith",
                vec![signature("startsWith", Bool, vec![Str, Str], false, true)],
            ),
            (
                "endswith",
                vec![signature("endsWith", Bool, vec![Str, Str], false, true)],
            ),
            (
                "format",
                vec![signature("format", Str, vec![Str, Any], true, true)],
            ),
            (
                "join",
                vec![
                    signature("join", Str, vec![strings(), Str], false, true),
                    signature("join", Str, vec![strings()], false, true),
                ],
            ),
            (
                "tojson",
                vec![signature("toJSON", Str, vec![Any], false, true)],
            ),
            (
                "fromjson",
                vec![signature("fromJSON", Any, vec![Str], false, false)],
            ),
            (
                "hashfiles",
                vec![signature("hashFiles", Str, vec![Str], true, false)],
            ),
            (
                "success",
                vec![signature("success", Bool, vec![], false, false)],
            ),
            (
                "always",
                vec![signature("always", Bool, vec![], false, false)],
            ),
            (
                "cancelled",
                vec![signature("cancelled", Bool, vec![], false, false)],
            ),
            (
                "failure",
                vec![signature("failure", Bool, vec![], false, false)],
            ),
            (
                "case",
                vec![signature("case", Any, vec![Bool, Any, Any], true, true)],
            ),
        ])
    })
}

fn strict(props: &[(&str, ExprType)]) -> ExprType {
    ExprType::Object(ObjectType::strict_with(
        props
            .iter()
            .map(|(k, v)| ((*k).to_owned(), v.clone()))
            .collect(),
    ))
}

fn globals() -> &'static BTreeMap<String, ExprType> {
    static GLOBALS: OnceLock<BTreeMap<String, ExprType>> = OnceLock::new();
    GLOBALS.get_or_init(|| {
        use ExprType::{Bool, Number, String as Str};
        let github_strings = [
            "action",
            "action_path",
            "action_ref",
            "action_repository",
            "action_status",
            "actor",
            "actor_id",
            "api_url",
            "base_ref",
            "env",
            "event_name",
            "event_path",
            "graphql_url",
            "head_ref",
            "job",
            "output",
            "path",
            "ref",
            "ref_name",
            "ref_type",
            "repository",
            "repository_id",
            "repository_owner",
            "repository_owner_id",
            "repository_visibility",
            "repositoryurl",
            "run_attempt",
            "run_id",
            "run_number",
            "secret_source",
            "server_url",
            "sha",
            "state",
            "step_summary",
            "token",
            "triggering_actor",
            "workflow",
            "workflow_ref",
            "workflow_sha",
            "workspace",
        ];
        let mut github: BTreeMap<String, ExprType> = github_strings
            .iter()
            .map(|k| ((*k).to_owned(), Str))
            .collect();
        github.insert("artifact_cache_size_limit".to_owned(), Number);
        github.insert("event".to_owned(), ExprType::Object(ObjectType::loose()));
        github.insert("ref_protected".to_owned(), Bool);
        github.insert("retention_days".to_owned(), Number);
        let runner = [
            "name",
            "os",
            "arch",
            "temp",
            "tool_cache",
            "debug",
            "environment",
        ];
        BTreeMap::from([
            (
                "github".to_owned(),
                ExprType::Object(ObjectType::strict_with(github)),
            ),
            ("env".to_owned(), ExprType::Object(ObjectType::map_of(Str))),
            (
                "job".to_owned(),
                strict(&[
                    ("check_run_id", Number),
                    ("container", strict(&[("id", Str), ("network", Str)])),
                    (
                        "services",
                        ExprType::Object(ObjectType::map_of(strict(&[
                            ("id", Str),
                            ("network", Str),
                            ("ports", ExprType::Object(ObjectType::map_of(Str))),
                        ]))),
                    ),
                    ("status", Str),
                ]),
            ),
            ("steps".to_owned(), ExprType::Object(ObjectType::strict())),
            (
                "runner".to_owned(),
                strict(&runner.iter().map(|k| (*k, Str)).collect::<Vec<_>>()),
            ),
            (
                "secrets".to_owned(),
                ExprType::Object(ObjectType::map_of(Str)),
            ),
            (
                "strategy".to_owned(),
                ExprType::Object(ObjectType::loose_with(BTreeMap::from([
                    ("fail-fast".to_owned(), Bool),
                    ("job-index".to_owned(), Number),
                    ("job-total".to_owned(), Number),
                    ("max-parallel".to_owned(), Number),
                ]))),
            ),
            ("matrix".to_owned(), ExprType::Object(ObjectType::strict())),
            ("needs".to_owned(), ExprType::Object(ObjectType::strict())),
            ("inputs".to_owned(), ExprType::Object(ObjectType::strict())),
            ("vars".to_owned(), ExprType::Object(ObjectType::map_of(Str))),
        ])
    })
}

fn format_placeholders(format: &str) -> BTreeSet<usize> {
    let mut found = BTreeSet::new();
    let chars: Vec<(usize, char)> = format.char_indices().collect();
    let mut start: Option<usize> = None;
    let mut end: Option<usize> = None;
    for &(i, r) in &chars {
        let Some(s) = start else {
            if r == '{' {
                start = Some(i + 1);
            }
            continue;
        };
        if end.is_none() {
            if r == '{' && i == s {
                start = None;
            } else if r == '}' {
                if i == s {
                    start = None;
                } else {
                    end = Some(i);
                }
            } else if !r.is_ascii_digit() {
                start = if r == '{' { Some(i + 1) } else { None };
            }
            continue;
        }
        let e = end.unwrap_or_default();
        if r == '}' {
            continue;
        }
        if (i - e) % 2 == 1
            && let Ok(v) = format[s..e].parse::<usize>()
        {
            found.insert(v);
        }
        start = if r == '{' { Some(i + 1) } else { None };
        end = None;
    }
    if let (Some(s), Some(e)) = (start, end)
        && (format.len() - e) % 2 == 1
        && let Ok(v) = format[s..e].parse::<usize>()
    {
        found.insert(v);
    }
    found
}

pub struct Checker {
    vars: BTreeMap<String, ExprType>,
    errors: Vec<ExprError>,
    untrusted: Option<Untrusted>,
    contexts: Option<Vec<String>>,
    special: Vec<String>,
    config_vars: Option<Vec<String>>,
}

impl Checker {
    #[must_use]
    pub fn new(check_untrusted: bool, config_vars: Option<Vec<String>>) -> Self {
        Self {
            vars: globals().clone(),
            errors: Vec::new(),
            untrusted: check_untrusted.then(Untrusted::new),
            contexts: None,
            special: Vec::new(),
            config_vars,
        }
    }

    pub fn set_var(&mut self, name: &str, ty: ObjectType) {
        self.vars.insert(name.to_owned(), ExprType::Object(ty));
    }

    pub fn update_secrets(&mut self, ty: &ObjectType) {
        let mut copied = ObjectType::strict_with(BTreeMap::from([
            ("github_token".to_owned(), ExprType::String),
            ("actions_step_debug".to_owned(), ExprType::String),
            ("actions_runner_debug".to_owned(), ExprType::String),
        ]));
        for (name, value) in &ty.props {
            copied.props.insert(name.clone(), value.clone());
        }
        self.set_var("secrets", copied);
    }

    pub fn update_inputs(&mut self, ty: &ObjectType) {
        let merged = match self.vars.get("inputs") {
            Some(ExprType::Object(current))
                if !(current.props.is_empty() && current.is_strict()) =>
            {
                ExprType::Object(current.clone()).merge(&ExprType::Object(ty.clone()))
            }
            _ => ExprType::Object(ty.clone()),
        };
        self.vars.insert("inputs".to_owned(), merged);
    }

    pub fn update_dispatch_inputs(&mut self, ty: &ObjectType) {
        self.update_inputs(ty);
        let props = ty
            .props
            .keys()
            .map(|k| (k.clone(), ExprType::String))
            .collect();
        if let Some(ExprType::Object(github)) = self.vars.get_mut("github")
            && let Some(ExprType::Object(event)) = github.props.get_mut("event")
        {
            event.props.insert(
                "inputs".to_owned(),
                ExprType::Object(ObjectType::strict_with(props)),
            );
        }
    }

    pub fn set_workflow_key(&mut self, key: &str) {
        match super::availability::workflow_key(key) {
            Some(availability) => {
                self.contexts = Some(availability.contexts.clone());
                self.special = availability.functions.clone();
            }
            None => {
                self.contexts = Some(Vec::new());
                self.special = Vec::new();
            }
        }
    }

    fn error(&mut self, expr: &Expr, message: String) {
        self.errors.push(ExprError::at(expr.token(), message));
    }

    fn check_context(&mut self, expr: &Expr, name: &str) {
        let Some(contexts) = &self.contexts else {
            return;
        };
        let lower = name.to_lowercase();
        if contexts.iter().any(|c| *c == lower) {
            return;
        }
        let notes = match contexts.len() {
            0 => "no context is available here".to_owned(),
            1 => format!("available context is {}", quotes(contexts)),
            _ => format!("available contexts are {}", quotes(contexts)),
        };
        self.error(
            expr,
            format!(
                "context {} is not allowed here. {notes}. see https://docs.github.com/en/actions/learn-github-actions/contexts#context-availability for more details",
                quote(name)
            ),
        );
    }

    fn check_variable(&mut self, expr: &Expr, name: &str) -> ExprType {
        let Some(ty) = self.vars.get(name).cloned() else {
            let names: Vec<&String> = self.vars.keys().collect();
            let message = format!(
                "undefined variable {}. available variables are {}",
                quote(&expr.token().value),
                sorted_quotes(&names)
            );
            self.error(expr, message);
            return ExprType::Any;
        };
        self.check_context(expr, name);
        ty
    }

    fn check_config_variable(&mut self, expr: &Expr, property: &str) {
        let note = "note: see the convention at https://docs.github.com/en/actions/learn-github-actions/variables#naming-conventions-for-configuration-variables";
        if property.starts_with("github_") {
            self.error(
                expr,
                format!(
                    "configuration variable name {} must not start with the GITHUB_ prefix (case insensitive). {note}",
                    quote(property)
                ),
            );
            return;
        }
        if !property
            .chars()
            .all(|r| r.is_ascii_digit() || r.is_ascii_lowercase() || r == '_')
        {
            self.error(
                expr,
                format!(
                    "configuration variable name {} can only contain alphabets, decimal numbers, and '_'. {note}",
                    quote(property)
                ),
            );
            return;
        }
        let Some(defined) = self.config_vars.clone() else {
            return;
        };
        if defined.is_empty() {
            self.error(
                expr,
                format!(
                    "no configuration variable is allowed since the variables list is empty in actionlint.yaml. you may forget adding the variable {} to the list",
                    quote(property)
                ),
            );
            return;
        }
        if defined.iter().any(|v| v.eq_ignore_ascii_case(property)) {
            return;
        }
        self.error(
            expr,
            format!(
                "undefined configuration variable {}. defined configuration variables in actionlint.yaml are {}",
                quote(property),
                sorted_quotes(&defined)
            ),
        );
    }

    fn check_object_deref(&mut self, expr: &Expr, receiver: &Expr, property: &str) -> ExprType {
        match self.check(receiver) {
            ExprType::Any => ExprType::Any,
            ExprType::Object(object) => {
                if let Some(ty) = object.props.get(property) {
                    return ty.clone();
                }
                if let Some(mapped) = &object.mapped {
                    if matches!(receiver, Expr::Variable { name, .. } if name == "vars") {
                        self.check_config_variable(expr, property);
                    }
                    return (**mapped).clone();
                }
                let described = ExprType::Object(object).describe();
                self.error(
                    expr,
                    format!(
                        "property {} is not defined in object type {described}",
                        quote(property)
                    ),
                );
                ExprType::Any
            }
            ExprType::Array(array) => {
                if !array.deref {
                    let described = ExprType::Array(array).describe();
                    self.error(
                        expr,
                        format!(
                            "receiver of object dereference {} must be type of object but got {}",
                            quote(property),
                            quote(&described)
                        ),
                    );
                    return ExprType::Any;
                }
                match *array.elem {
                    ExprType::Any => ExprType::Array(array),
                    ExprType::Object(element) => {
                        let elem = if let Some(ty) = element.props.get(property) {
                            ty.clone()
                        } else if let Some(mapped) = &element.mapped {
                            (**mapped).clone()
                        } else {
                            let described = ExprType::Object(element.clone()).describe();
                            self.error(
                                expr,
                                format!(
                                    "property {} is not defined in object type {described} as element of filtered array",
                                    quote(property)
                                ),
                            );
                            ExprType::Any
                        };
                        ExprType::Array(ArrayType {
                            elem: Box::new(elem),
                            deref: true,
                        })
                    }
                    other => {
                        self.error(
                            expr,
                            format!(
                                "property filtered by {} at object filtering must be type of object but got {}",
                                quote(property),
                                quote(&other.describe())
                            ),
                        );
                        ExprType::Any
                    }
                }
            }
            other => {
                self.error(
                    expr,
                    format!(
                        "receiver of object dereference {} must be type of object but got {}",
                        quote(property),
                        quote(&other.describe())
                    ),
                );
                ExprType::Any
            }
        }
    }

    fn check_array_deref(&mut self, expr: &Expr, receiver: &Expr) -> ExprType {
        let deref_any = || {
            ExprType::Array(ArrayType {
                elem: Box::new(ExprType::Any),
                deref: true,
            })
        };
        match self.check(receiver) {
            ExprType::Any => deref_any(),
            ExprType::Array(mut array) => {
                array.deref = true;
                ExprType::Array(array)
            }
            ExprType::Object(object) => {
                if let Some(mapped) = &object.mapped {
                    return match &**mapped {
                        ExprType::Any => deref_any(),
                        ExprType::Object(_) => ExprType::Array(ArrayType {
                            elem: mapped.clone(),
                            deref: true,
                        }),
                        other => {
                            let message = format!(
                                "elements of object at receiver of object filtering `.*` must be type of object but got {}. the type of receiver was {}",
                                quote(&other.describe()),
                                quote(&ExprType::Object(object.clone()).describe())
                            );
                            self.error(expr, message);
                            ExprType::Any
                        }
                    };
                }
                if !object
                    .props
                    .values()
                    .any(|t| matches!(t, ExprType::Object(_)))
                {
                    let described = ExprType::Object(object).describe();
                    self.error(
                        expr,
                        format!(
                            "object type {} cannot be filtered by object filtering `.*` since it has no object element",
                            quote(&described)
                        ),
                    );
                    return ExprType::Any;
                }
                deref_any()
            }
            other => {
                self.error(
                    expr,
                    format!(
                        "receiver of object filtering `.*` must be type of array or object but got {}",
                        quote(&other.describe())
                    ),
                );
                ExprType::Any
            }
        }
    }

    fn check_index(&mut self, expr: &Expr, operand: &Expr, index: &Expr) -> ExprType {
        let idx = self.check(index);
        match self.check(operand) {
            ExprType::Any => ExprType::Any,
            ExprType::Array(array) => match idx {
                ExprType::Any | ExprType::Number => *array.elem,
                other => {
                    self.error(
                        index,
                        format!(
                            "index access of array must be type of number but got {}",
                            quote(&other.describe())
                        ),
                    );
                    ExprType::Any
                }
            },
            ExprType::Object(object) => match idx {
                ExprType::Any => ExprType::Any,
                ExprType::String => {
                    if let Expr::Str { value, .. } = index {
                        if let Some(prop) = object.props.get(value) {
                            return prop.clone();
                        }
                        if let Some(mapped) = &object.mapped {
                            return (**mapped).clone();
                        }
                        let described = ExprType::Object(object.clone()).describe();
                        self.error(
                            expr,
                            format!(
                                "property {} is not defined in object type {described}",
                                quote(value)
                            ),
                        );
                    }
                    object.mapped.map_or(ExprType::Any, |m| *m)
                }
                other => {
                    self.error(
                        index,
                        format!(
                            "property access of object must be type of string but got {}",
                            quote(&other.describe())
                        ),
                    );
                    ExprType::Any
                }
            },
            other => {
                self.error(
                    expr,
                    format!(
                        "index access operand must be type of object or array but got {}",
                        quote(&other.describe())
                    ),
                );
                ExprType::Any
            }
        }
    }

    fn signature_error(
        expr: &Expr,
        args: &[Expr],
        sig: &Signature,
        types: &[ExprType],
    ) -> Option<ExprError> {
        let (lp, la) = (sig.params.len(), types.len());
        if (sig.variadic && lp > la) || (!sig.variadic && lp != la) {
            let at_least = if sig.variadic { "at least " } else { "" };
            return Some(ExprError::at(
                expr.token(),
                format!(
                    "number of arguments is wrong. function {} takes {at_least}{lp} parameters but {la} arguments are given",
                    quote(&sig.describe())
                ),
            ));
        }
        let mismatch = |i: usize, param: &ExprType, arg: &ExprType| {
            ExprError::at(
                args[i].token(),
                format!(
                    "{} argument of function call is not assignable. {} cannot be assigned to {}. called function type is {}",
                    ordinal(i + 1),
                    quote(&arg.describe()),
                    quote(&param.describe()),
                    quote(&sig.describe())
                ),
            )
        };
        for (i, param) in sig.params.iter().enumerate() {
            if !param.assignable(&types[i]) {
                return Some(mismatch(i, param, &types[i]));
            }
        }
        if sig.variadic {
            let param = &sig.params[lp - 1];
            for (offset, arg) in types[lp..].iter().enumerate() {
                if !param.assignable(arg) {
                    return Some(mismatch(lp + offset, param, arg));
                }
            }
        }
        None
    }

    fn check_special(&mut self, expr: &Expr, callee: &str) {
        let lower = callee.to_lowercase();
        let Some(allowed) = table().special.get(&lower) else {
            return;
        };
        if self.special.contains(&lower) {
            return;
        }
        self.error(
            expr,
            format!(
                "calling function {} is not allowed here. {} is only available in {}. see https://docs.github.com/en/actions/learn-github-actions/contexts#context-availability for more details",
                quote(callee),
                quote(callee),
                quotes(allowed)
            ),
        );
    }

    fn check_builtin(
        &mut self,
        expr: &Expr,
        callee: &str,
        args: &[Expr],
        ret: &ExprType,
    ) -> ExprType {
        self.check_special(expr, callee);
        match callee.to_lowercase().as_str() {
            "format" => {
                let Some(Expr::Str { value, .. }) = args.first() else {
                    return ret.clone();
                };
                let count = args.len() - 1;
                let mut holders = format_placeholders(value);
                for i in 0..count {
                    if !holders.remove(&i) {
                        self.error(
                            expr,
                            format!(
                                "format string {} does not contain placeholder {{{i}}}. remove argument which is unused in the format string",
                                quote(value)
                            ),
                        );
                    }
                }
                for i in holders {
                    self.error(
                        expr,
                        format!(
                            "format string {} contains placeholder {{{i}}} but only {count} arguments are given to format",
                            quote(value)
                        ),
                    );
                }
            }
            "fromjson" => {
                let Some(literal @ Expr::Str { value, .. }) = args.first() else {
                    return ret.clone();
                };
                match json::check(value) {
                    Ok(()) => {
                        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(value) {
                            return ExprType::of_json(&parsed);
                        }
                    }
                    Err(error) => {
                        self.error(
                            literal,
                            format!(
                                "broken JSON string is passed to fromJSON() at offset {}: {}",
                                error.offset, error.message
                            ),
                        );
                    }
                }
            }
            "case" => {
                if args.len() % 2 == 0 {
                    self.error(
                        expr,
                        format!(
                            "case() requires an odd number of arguments (pred/value pairs + default) but got {}",
                            args.len()
                        ),
                    );
                }
            }
            _ => {}
        }
        ret.clone()
    }

    fn check_call(&mut self, expr: &Expr, callee: &str, args: &[Expr]) -> ExprType {
        let lower = callee.to_lowercase();
        let Some(signatures) = functions().get(lower.as_str()) else {
            let names: Vec<&&str> = functions().keys().collect();
            let names: Vec<&str> = names.into_iter().copied().collect();
            self.error(
                expr,
                format!(
                    "undefined function {}. available functions are {}",
                    quote(callee),
                    sorted_quotes(&names)
                ),
            );
            return ExprType::Any;
        };
        let types: Vec<ExprType> = args.iter().map(|a| self.check(a)).collect();
        let mut errors = Vec::new();
        for sig in signatures {
            match Self::signature_error(expr, args, sig, &types) {
                None => return self.check_builtin(expr, callee, args, &sig.ret),
                Some(error) => errors.push(error),
            }
        }
        self.errors.extend(errors);
        ExprType::Any
    }

    fn check_not(&mut self, expr: &Expr, operand: &Expr) -> ExprType {
        let ty = self.check(operand);
        if !ExprType::Bool.assignable(&ty) {
            self.error(
                expr,
                format!(
                    "type of operand of ! operator {} is not assignable to type \"bool\"",
                    quote(&ty.describe())
                ),
            );
        }
        ExprType::Bool
    }

    fn comparable(op: CompareOp, l: &ExprType, r: &ExprType) -> bool {
        use ExprType::{Any, Array, Bool, Null, Number, Object, String as Str};
        match op {
            CompareOp::Eq | CompareOp::NotEq => match l {
                Any | Null => true,
                Number | Bool | Str => !matches!(r, Object(_) | Array(_)),
                Object(_) => matches!(r, Object(_) | Null | Any),
                Array(left) => match r {
                    Array(right) => Self::comparable(op, &left.elem, &right.elem),
                    Null | Any => true,
                    _ => false,
                },
            },
            _ => match l {
                Any | Number | Str => !matches!(r, Null | Bool | Object(_) | Array(_)),
                _ => false,
            },
        }
    }

    fn check_compare(&mut self, expr: &Expr, op: CompareOp, left: &Expr, right: &Expr) -> ExprType {
        let l = self.check(left);
        let r = self.check(right);
        if !Self::comparable(op, &l, &r) {
            self.error(
                expr,
                format!(
                    "{} value cannot be compared to {} value with {} operator",
                    quote(&l.describe()),
                    quote(&r.describe()),
                    quote(op.describe())
                ),
            );
        }
        ExprType::Bool
    }

    fn check_narrowing(&mut self, expr: &Expr, truthy: bool) -> ExprType {
        match expr {
            Expr::Logical { op, left, right } => {
                if (*op == LogicalOp::And && truthy) || (*op == LogicalOp::Or && !truthy) {
                    self.check(left);
                    return self.check(right);
                }
                self.check_logical(*op, left, right)
            }
            Expr::Not { operand, .. } => self.check_narrowing(operand, !truthy),
            _ => self.check(expr),
        }
    }

    fn check_logical(&mut self, op: LogicalOp, left: &Expr, right: &Expr) -> ExprType {
        let l = self.check_narrowing(left, op == LogicalOp::Or);
        let r = self.check(right);
        l.merge(&r)
    }

    fn check(&mut self, expr: &Expr) -> ExprType {
        if let Some(untrusted) = &mut self.untrusted {
            untrusted.enter(expr);
        }
        let ty = match expr {
            Expr::Variable { name, .. } => self.check_variable(expr, name),
            Expr::Null { .. } => ExprType::Null,
            Expr::Bool { .. } => ExprType::Bool,
            Expr::Str { .. } => ExprType::String,
            Expr::Int { .. } | Expr::Float { .. } => ExprType::Number,
            Expr::ObjectDeref { receiver, property } => {
                self.check_object_deref(expr, receiver, property)
            }
            Expr::ArrayDeref { receiver } => self.check_array_deref(expr, receiver),
            Expr::Index { operand, index } => self.check_index(expr, operand, index),
            Expr::Call { callee, args, .. } => self.check_call(expr, callee, args),
            Expr::Not { operand, .. } => self.check_not(expr, operand),
            Expr::Compare { op, left, right } => self.check_compare(expr, *op, left, right),
            Expr::Logical { op, left, right } => self.check_logical(*op, left, right),
        };
        if let Some(untrusted) = &mut self.untrusted {
            untrusted.leave(expr);
        }
        ty
    }

    pub fn check_root(&mut self, expr: &Expr) -> (ExprType, Vec<ExprError>) {
        self.errors.clear();
        if let Some(untrusted) = &mut self.untrusted {
            untrusted.init();
        }
        let ty = self.check(expr);
        let mut errors = std::mem::take(&mut self.errors);
        if let Some(untrusted) = &mut self.untrusted {
            untrusted.finish();
            errors.extend(untrusted.take_errors());
        }
        (ty, errors)
    }

    #[must_use]
    pub fn is_constant(expr: &Expr) -> bool {
        match expr {
            Expr::Null { .. }
            | Expr::Bool { .. }
            | Expr::Int { .. }
            | Expr::Float { .. }
            | Expr::Str { .. } => true,
            Expr::Variable { .. }
            | Expr::ObjectDeref { .. }
            | Expr::ArrayDeref { .. }
            | Expr::Index { .. } => false,
            Expr::Not { operand, .. } => Self::is_constant(operand),
            Expr::Compare { left, right, .. } | Expr::Logical { left, right, .. } => {
                Self::is_constant(left) && Self::is_constant(right)
            }
            Expr::Call { callee, args, .. } => {
                args.iter().all(Self::is_constant)
                    && functions()
                        .get(callee.to_lowercase().as_str())
                        .is_some_and(|sigs| sigs.iter().all(|s| s.constant))
            }
        }
    }
}
