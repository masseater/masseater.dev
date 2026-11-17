use std::collections::BTreeMap;
use std::sync::Arc;

use crate::entities::action::{ActionMetadata, popular};
use crate::entities::reusable_workflow::input_type;
use crate::entities::workflow::Event;
use crate::entities::workflow::{
    Bool, CallEventOutput, CallInputType, Concurrency, Container, Defaults, DispatchInputType, Env,
    EventFilter, Exec, Float, Int, Job, Matrix, MatrixRow, RawValue, Snapshot, Step, Text,
    Workflow, WorkflowCall, is_expression_assigned,
};
use crate::features::check_workflow::{Project, Report, Rule};
use crate::shared::expression::ast::{Expr, ExprError};
use crate::shared::expression::lexer::Lexer;
use crate::shared::expression::parser::parse;
use crate::shared::expression::sema::Checker;
use crate::shared::expression::types::{ArrayType, ExprType, ObjectType};
use crate::shared::text::quote;
use crate::shared::yaml::{Pos, parse_go_float};

struct Typed {
    ty: ExprType,
    pos: Pos,
}

enum JobInfo {
    Steps { outputs: Vec<String> },
    Call { uses: Option<Text> },
}

pub struct Expression {
    report: Report,
    project: Option<Arc<Project>>,
    variables: Option<Vec<String>>,
    matrix: Option<ObjectType>,
    steps: Option<ObjectType>,
    needs: Option<ObjectType>,
    secrets: Option<ObjectType>,
    inputs: Option<ObjectType>,
    dispatch_inputs: Option<ObjectType>,
    jobs: Option<ObjectType>,
    workflow_jobs: BTreeMap<String, JobInfo>,
}

fn string_map() -> ObjectType {
    ObjectType::map_of(ExprType::String)
}

fn strict(props: impl IntoIterator<Item = (String, ExprType)>) -> ObjectType {
    ObjectType::strict_with(props.into_iter().collect())
}

fn action_outputs(meta: &ActionMetadata) -> ObjectType {
    if meta.skip_outputs {
        return ObjectType::loose();
    }
    strict(
        meta.outputs
            .keys()
            .map(|name| (name.to_lowercase(), ExprType::String)),
    )
}

fn literal_type(value: &str) -> ExprType {
    let trimmed = value.trim();
    match trimmed {
        "true" | "false" => ExprType::Bool,
        "null" => ExprType::Null,
        _ if parse_go_float(trimmed).is_some() => ExprType::Number,
        _ => ExprType::String,
    }
}

impl Expression {
    pub fn new(project: Option<Arc<Project>>) -> Self {
        let variables = project.as_ref().and_then(|p| p.config.variables.clone());
        Self {
            report: Report::default(),
            project,
            variables,
            matrix: None,
            steps: None,
            needs: None,
            secrets: None,
            inputs: None,
            dispatch_inputs: None,
            jobs: None,
            workflow_jobs: BTreeMap::new(),
        }
    }

    fn expr_error(&mut self, error: &ExprError, line: usize, col: usize) {
        let pos = Pos::new(error.line + line - 1, error.column + col - 1);
        self.error(pos, error.message.clone());
    }

    fn check_node(
        &mut self,
        expr: &Expr,
        line: usize,
        col: usize,
        untrusted: bool,
        key: &str,
    ) -> Option<ExprType> {
        let mut checker = Checker::new(untrusted, self.variables.clone());
        for (name, ty) in [
            ("matrix", &self.matrix),
            ("steps", &self.steps),
            ("needs", &self.needs),
        ] {
            if let Some(ty) = ty {
                checker.set_var(name, ty.clone());
            }
        }
        if let Some(ty) = &self.secrets {
            checker.update_secrets(ty);
        }
        if let Some(ty) = &self.inputs {
            checker.update_inputs(ty);
        }
        if let Some(ty) = &self.dispatch_inputs {
            checker.update_dispatch_inputs(ty);
        }
        if let Some(ty) = &self.jobs {
            checker.set_var("jobs", ty.clone());
        }
        if !key.is_empty() {
            debug_assert!(
                crate::shared::expression::availability::workflow_key(key).is_some(),
                "{key} is missing in availability.json"
            );
            checker.set_workflow_key(key);
        }
        let (ty, errors) = checker.check_root(expr);
        for error in &errors {
            self.expr_error(error, line, col);
        }
        errors.is_empty().then_some(ty)
    }

    fn check_semantics(
        &mut self,
        source: &str,
        line: usize,
        col: usize,
        untrusted: bool,
        key: &str,
    ) -> (Option<ExprType>, usize) {
        let mut lexer = Lexer::new(source);
        match parse(&mut lexer) {
            Err(error) => {
                self.expr_error(&error, line, col);
                (None, lexer.offset())
            }
            Ok(expr) => {
                let ty = self.check_node(&expr, line, col, untrusted, key);
                (ty, lexer.offset())
            }
        }
    }

    fn check_exprs_in(
        &mut self,
        text: &str,
        pos: Pos,
        quoted: bool,
        untrusted: bool,
        key: &str,
    ) -> Option<Vec<Typed>> {
        let line = pos.line;
        let base = if quoted { pos.col + 1 } else { pos.col };
        let mut rest = text;
        let mut offset = 0;
        let mut typed = Vec::new();
        while let Some(index) = rest.find("${{") {
            let start = index + 3;
            rest = &rest[start..];
            offset += start;
            let col = base + offset;
            let (ty, after) = self.check_semantics(rest, line, col, untrusted, key);
            let ty = ty?;
            if after == 0 {
                return Some(Vec::new());
            }
            typed.push(Typed {
                ty,
                pos: Pos::new(line, col - 3),
            });
            rest = rest.get(after..).unwrap_or_default();
            offset += after;
        }
        Some(typed)
    }

    fn check_evaluated(&mut self, typed: &[Typed]) {
        for t in typed {
            if matches!(
                t.ty,
                ExprType::Object(_) | ExprType::Array(_) | ExprType::Null
            ) {
                self.error(
                    t.pos,
                    format!(
                        "object, array, and null values should not be evaluated in template with ${{{{ }}}} but evaluating the value of type {}",
                        t.ty.describe()
                    ),
                );
            }
        }
    }

    fn check_string(&mut self, text: Option<&Text>, key: &str) -> Vec<Typed> {
        let Some(text) = text else {
            return Vec::new();
        };
        let Some(typed) = self.check_exprs_in(&text.value, text.pos, text.quoted, false, key)
        else {
            return Vec::new();
        };
        self.check_evaluated(&typed);
        typed
    }

    fn check_strings(&mut self, texts: &[Text], key: &str) {
        for text in texts {
            self.check_string(Some(text), key);
        }
    }

    fn check_script(&mut self, text: Option<&Text>, key: &str) {
        let Some(text) = text else {
            return;
        };
        if let Some(typed) = self.check_exprs_in(&text.value, text.pos, text.quoted, true, key) {
            self.check_evaluated(&typed);
        }
    }

    fn check_one(&mut self, text: Option<&Text>, what: &str, key: &str) -> Option<ExprType> {
        let text = text?;
        let mut typed = self.check_exprs_in(&text.value, text.pos, text.quoted, false, key)?;
        if typed.len() != 1 {
            self.error(
                text.pos,
                format!(
                    "one ${{{{ }}}} expression should be included in {} value but got {} expressions",
                    quote(what),
                    typed.len()
                ),
            );
            return None;
        }
        typed.pop().map(|t| t.ty)
    }

    fn expect_type(
        &mut self,
        ty: ExprType,
        pos: Pos,
        what: &str,
        name: &str,
        ok: fn(&ExprType) -> bool,
    ) -> Option<ExprType> {
        if ok(&ty) {
            return Some(ty);
        }
        self.error(
            pos,
            format!(
                "type of expression at {} must be {name} but found type {}",
                quote(what),
                ty.describe()
            ),
        );
        None
    }

    fn check_object_ty(&mut self, ty: ExprType, pos: Pos, what: &str) -> Option<ExprType> {
        self.expect_type(ty, pos, what, "object", |t| {
            matches!(t, ExprType::Object(_) | ExprType::Any)
        })
    }

    fn check_object_expr(
        &mut self,
        text: Option<&Text>,
        what: &str,
        key: &str,
    ) -> Option<ExprType> {
        let ty = self.check_one(text, what, key)?;
        self.check_object_ty(ty, text?.pos, what)
    }

    fn check_array_expr(&mut self, text: Option<&Text>, what: &str, key: &str) -> Option<ExprType> {
        let ty = self.check_one(text, what, key)?;
        self.expect_type(ty, text?.pos, what, "array", |t| {
            matches!(t, ExprType::Array(_) | ExprType::Any)
        })
    }

    fn check_number_expr(&mut self, text: Option<&Text>, what: &str, key: &str) {
        if let Some(ty) = self.check_one(text, what, key)
            && let Some(text) = text
        {
            self.expect_type(ty, text.pos, what, "number", |t| {
                matches!(t, ExprType::Number | ExprType::Any)
            });
        }
    }

    fn check_bool(&mut self, value: Option<&Bool>, key: &str) {
        let Some(expression) = value.and_then(|b| b.expression.as_ref()) else {
            return;
        };
        let Some(ty) = self.check_one(Some(expression), "bool value", key) else {
            return;
        };
        if !matches!(ty, ExprType::Bool | ExprType::Any) {
            self.error(
                expression.pos,
                format!(
                    "type of expression must be bool but found type {}",
                    ty.describe()
                ),
            );
        }
    }

    fn check_int(&mut self, value: Option<&Int>, key: &str) {
        if let Some(value) = value {
            self.check_number_expr(value.expression.as_ref(), "integer value", key);
        }
    }

    fn check_float(&mut self, value: Option<&Float>, key: &str) {
        if let Some(value) = value {
            self.check_number_expr(value.expression.as_ref(), "float number value", key);
        }
    }

    fn check_env(&mut self, env: Option<&Env>, key: &str) {
        let Some(env) = env else {
            return;
        };
        if env.expression.is_some() {
            self.check_object_expr(env.expression.as_ref(), "env", key);
            return;
        }
        for var in env.vars.values() {
            self.check_string(Some(&var.name), key);
            self.check_string(Some(&var.value), key);
        }
    }

    fn check_container(&mut self, container: Option<&Container>, key: &str, child: &str) {
        let Some(container) = container else {
            return;
        };
        let child_key = if child.is_empty() {
            key.to_owned()
        } else {
            format!("{key}.{child}")
        };
        self.check_string(container.image.as_ref(), key);
        if let Some(credentials) = &container.credentials {
            let credentials_key = format!("{child_key}.credentials");
            if credentials.expression.is_some() {
                self.check_object_expr(
                    credentials.expression.as_ref(),
                    "credentials",
                    &credentials_key,
                );
            } else {
                self.check_string(credentials.username.as_ref(), &credentials_key);
                self.check_string(credentials.password.as_ref(), &credentials_key);
            }
        }
        self.check_env(container.env.as_ref(), &format!("{child_key}.env.<env_id>"));
        self.check_strings(&container.ports, key);
        self.check_strings(&container.volumes, key);
        self.check_string(container.options.as_ref(), key);
    }

    fn check_concurrency(&mut self, concurrency: Option<&Concurrency>, key: &str) {
        if let Some(concurrency) = concurrency {
            self.check_string(concurrency.group.as_ref(), key);
            self.check_bool(concurrency.cancel_in_progress.as_ref(), key);
        }
    }

    fn check_defaults(&mut self, defaults: Option<&Defaults>, key: &str) {
        if let Some(run) = defaults.and_then(|d| d.run.as_ref()) {
            self.check_string(run.shell.as_ref(), key);
            self.check_string(run.working_directory.as_ref(), key);
        }
    }

    fn check_filter(&mut self, filter: Option<&EventFilter>) {
        if let Some(filter) = filter {
            self.check_strings(&filter.values, "");
        }
    }

    fn check_if(&mut self, text: Option<&Text>, key: &str) {
        let Some(text) = text else {
            return;
        };
        let condition = if text.contains_expression() {
            let typed = self.check_string(Some(text), key);
            match typed.as_slice() {
                [one] if text.is_expression_assigned() => Some(one.ty.clone()),
                _ => None,
            }
        } else {
            let source = format!("{}}}}}", text.value);
            let mut lexer = Lexer::new(&source);
            match parse(&mut lexer) {
                Err(error) => {
                    self.expr_error(&error, text.pos.line, text.pos.col);
                    return;
                }
                Ok(expr) => self.check_node(&expr, text.pos.line, text.pos.col, false, key),
            }
        };
        if let Some(ty) = condition
            && !ExprType::Bool.assignable(&ty)
        {
            self.error(
                text.pos,
                format!(
                    "\"if\" condition should be type \"bool\" but got type {}",
                    quote(&ty.describe())
                ),
            );
        }
    }

    fn reusable_outputs(&mut self, uses: Option<&Text>) -> ObjectType {
        let (Some(uses), Some(project)) = (uses, self.project.clone()) else {
            return string_map();
        };
        match project.workflows.find(&project.root, &uses.value) {
            Err(message) => {
                self.error(uses.pos, message);
                string_map()
            }
            Ok(None) => string_map(),
            Ok(Some(metadata)) => strict(
                metadata
                    .outputs
                    .keys()
                    .map(|name| (name.clone(), ExprType::String)),
            ),
        }
    }

    fn action_outputs_of(&mut self, uses: Option<&Text>) -> ObjectType {
        let Some(uses) = uses else {
            return string_map();
        };
        if uses.value.starts_with("./") {
            let Some(project) = self.project.clone() else {
                return string_map();
            };
            return match project.actions.find(&project.root, &uses.value) {
                Err(message) => {
                    self.error(uses.pos, message);
                    string_map()
                }
                Ok(None) => string_map(),
                Ok(Some(found)) => action_outputs(&found.metadata),
            };
        }
        if uses.value.starts_with("actions/github-script@") {
            return ObjectType::loose();
        }
        popular(&uses.value).map_or_else(string_map, action_outputs)
    }

    fn check_workflow_call(&mut self, call: Option<&WorkflowCall>) {
        let Some(call) = call else {
            return;
        };
        let Some(uses) = &call.uses else {
            return;
        };
        self.check_string(Some(uses), "");
        let metadata = match &self.project {
            Some(project) => match project.workflows.find(&project.root, &uses.value) {
                Err(message) => {
                    self.error(uses.pos, message);
                    None
                }
                Ok(found) => found,
            },
            None => None,
        };
        for (id, input) in &call.inputs {
            let typed = self.check_string(Some(&input.value), "jobs.<job_id>.with.<input_id>");
            let Some(spec) = metadata.as_ref().and_then(|m| m.inputs.get(id)) else {
                continue;
            };
            if spec.ty == ExprType::Any {
                continue;
            }
            let ty = match typed.as_slice() {
                [] => literal_type(&input.value.value),
                [one] if input.value.is_expression_assigned() => one.ty.clone(),
                _ => ExprType::String,
            };
            if !spec.ty.assignable(&ty) {
                self.error(
                    input.value.pos,
                    format!(
                        "input {} is typed as {} by reusable workflow {}. {} value cannot be assigned",
                        quote(&spec.name),
                        spec.ty.describe(),
                        quote(&uses.value),
                        ty.describe()
                    ),
                );
            }
        }
        for secret in call.secrets.values() {
            self.check_string(Some(&secret.value), "jobs.<job_id>.secrets.<secret_id>");
        }
    }

    fn check_snapshot(&mut self, snapshot: Option<&Snapshot>) {
        if let Some(snapshot) = snapshot {
            self.check_if(snapshot.condition.as_ref(), "jobs.<job_id>.snapshot.if");
        }
    }

    fn needs_type(&mut self, job: &Job) -> ObjectType {
        let mut out = ObjectType::strict();
        for need in &job.needs {
            let id = need.value.to_lowercase();
            if id == job.id.value || out.props.contains_key(&id) {
                continue;
            }
            let Some(info) = self.workflow_jobs.get(&id) else {
                continue;
            };
            let outputs = match info {
                JobInfo::Steps { outputs } => {
                    strict(outputs.iter().map(|o| (o.clone(), ExprType::String)))
                }
                JobInfo::Call { uses } => {
                    let uses = uses.clone();
                    self.reusable_outputs(uses.as_ref())
                }
            };
            out.props.insert(
                id,
                ExprType::Object(strict([
                    ("outputs".to_owned(), ExprType::Object(outputs)),
                    ("result".to_owned(), ExprType::String),
                ])),
            );
        }
        out
    }

    fn check_raw(&mut self, value: &RawValue) -> ExprType {
        match value {
            RawValue::Object { props, .. } => ExprType::Object(strict(
                props
                    .iter()
                    .map(|(k, v)| (k.clone(), self.check_raw(v)))
                    .collect::<Vec<_>>(),
            )),
            RawValue::Array { elems, .. } => {
                let elem = elems
                    .iter()
                    .map(|v| self.check_raw(v))
                    .reduce(|acc, t| acc.merge(&t))
                    .unwrap_or(ExprType::Any);
                ExprType::array(elem)
            }
            RawValue::String { value, pos } => {
                let typed =
                    self.check_exprs_in(value, *pos, false, false, "jobs.<job_id>.strategy");
                if is_expression_assigned(value) {
                    return match typed.as_deref() {
                        Some([one]) => one.ty.clone(),
                        _ => ExprType::Any,
                    };
                }
                literal_type(value)
            }
        }
    }

    fn check_matrix_expression(&mut self, text: Option<&Text>) -> ObjectType {
        let Some(ExprType::Object(mut matrix)) =
            self.check_object_expr(text, "matrix", "jobs.<job_id>.strategy")
        else {
            return ObjectType::loose();
        };
        if let Some(include) = matrix.props.remove("include")
            && let ExprType::Array(ArrayType { elem, .. }) = include
            && let ExprType::Object(object) = *elem
        {
            for (name, prop) in object.props {
                let merged = match matrix.props.get(&name) {
                    Some(current) => current.merge(&prop),
                    None => prop,
                };
                matrix.props.insert(name, merged);
            }
        }
        matrix.props.remove("exclude");
        matrix
    }

    fn check_matrix_row(&mut self, row: &MatrixRow) -> ExprType {
        if row.expression.is_some() {
            return match self.check_array_expr(
                row.expression.as_ref(),
                "matrix row",
                "jobs.<job_id>.strategy",
            ) {
                Some(ExprType::Array(array)) => *array.elem,
                _ => ExprType::Any,
            };
        }
        row.values
            .iter()
            .map(|v| self.check_raw(v))
            .reduce(|acc, t| acc.merge(&t))
            .unwrap_or(ExprType::Any)
    }

    fn check_matrix(&mut self, matrix: &Matrix) -> ObjectType {
        if matrix.expression.is_some() {
            return self.check_matrix_expression(matrix.expression.as_ref());
        }
        if let Some(exclude) = &matrix.exclude {
            if let Some(expression) = &exclude.expression {
                if let Some(ExprType::Array(array)) =
                    self.check_array_expr(Some(expression), "exclude", "jobs.<job_id>.strategy")
                {
                    self.check_object_ty(*array.elem, expression.pos, "exclude");
                }
            } else {
                for combination in &exclude.combinations {
                    if combination.expression.is_some() {
                        self.check_object_expr(
                            combination.expression.as_ref(),
                            "exclude",
                            "jobs.<job_id>.strategy",
                        );
                        continue;
                    }
                    for assign in combination.assigns.values() {
                        self.check_raw(&assign.value);
                    }
                }
            }
        }
        let mut out = ObjectType::strict();
        for (name, row) in &matrix.rows {
            let ty = self.check_matrix_row(row);
            out.props.insert(name.clone(), ty);
        }
        let Some(include) = &matrix.include else {
            return out;
        };
        if let Some(expression) = &include.expression {
            if let Some(ExprType::Array(array)) =
                self.check_one(Some(expression), "include", "jobs.<job_id>.strategy")
                && let ExprType::Object(merged) = ExprType::Object(out).merge(&array.elem)
            {
                return merged;
            }
            return ObjectType::loose();
        }
        for combination in &include.combinations {
            if combination.expression.is_some() {
                continue;
            }
            for (name, assign) in &combination.assigns {
                let mut ty = self.check_raw(&assign.value);
                if let Some(current) = out.props.get(name) {
                    ty = current.merge(&ty);
                }
                out.props.insert(name.clone(), ty);
            }
        }
        out
    }

    fn check_call_outputs(
        &mut self,
        outputs: &BTreeMap<String, CallEventOutput>,
        workflow: &Workflow,
    ) {
        let Some(jobs) = &workflow.jobs else {
            return;
        };
        if outputs.is_empty() || jobs.is_empty() {
            return;
        }
        let props = jobs.iter().map(|(name, job)| {
            let outputs = if job.workflow_call.is_some() {
                ObjectType::loose()
            } else {
                strict(job.outputs.keys().map(|o| (o.clone(), ExprType::String)))
            };
            (
                name.clone(),
                ExprType::Object(strict([("outputs".to_owned(), ExprType::Object(outputs))])),
            )
        });
        self.jobs = Some(strict(props));
        for output in outputs.values() {
            self.check_string(
                output.value.as_ref(),
                "on.workflow_call.outputs.<output_id>.value",
            );
        }
    }

    fn check_events(&mut self, events: &[Event]) {
        for event in events {
            match event {
                Event::Webhook(hook) => {
                    self.check_strings(&hook.types, "");
                    for filter in [
                        &hook.branches,
                        &hook.branches_ignore,
                        &hook.tags,
                        &hook.tags_ignore,
                        &hook.paths,
                        &hook.paths_ignore,
                    ] {
                        self.check_filter(filter.as_ref());
                    }
                    self.check_strings(&hook.workflows, "");
                }
                Event::Schedule { schedules, .. } => {
                    for schedule in schedules {
                        self.check_string(Some(&schedule.cron), "");
                        self.check_string(schedule.timezone.as_ref(), "");
                    }
                }
                Event::WorkflowDispatch { inputs, .. } => {
                    let mut ty = ObjectType::strict();
                    for (id, input) in inputs {
                        self.check_string(input.description.as_ref(), "");
                        self.check_string(input.default.as_ref(), "");
                        self.check_bool(input.required.as_ref(), "");
                        self.check_strings(&input.options, "");
                        let input_ty = match input.kind {
                            DispatchInputType::Boolean => ExprType::Bool,
                            DispatchInputType::Number => ExprType::Number,
                            DispatchInputType::String
                            | DispatchInputType::Choice
                            | DispatchInputType::Environment => ExprType::String,
                            DispatchInputType::None => ExprType::Any,
                        };
                        ty.props.insert(id.clone(), input_ty);
                    }
                    self.dispatch_inputs = Some(ty);
                }
                Event::RepositoryDispatch { types, .. } => self.check_strings(types, ""),
                Event::WorkflowCall(call) => {
                    self.inputs = Some(ObjectType::strict());
                    for input in &call.inputs {
                        self.check_string(input.description.as_ref(), "");
                        let typed = self.check_string(
                            input.default.as_ref(),
                            "on.workflow_call.inputs.<inputs_id>.default",
                        );
                        let expected = match input.kind {
                            CallInputType::Boolean => Some("bool"),
                            CallInputType::Number => Some("number"),
                            CallInputType::String | CallInputType::Invalid => None,
                        };
                        if let (Some(name), [one], Some(default)) =
                            (expected, typed.as_slice(), &input.default)
                            && default.is_expression_assigned()
                            && one.ty != ExprType::Any
                            && one.ty != input_type(input.kind)
                        {
                            self.error(
                                default.pos,
                                format!(
                                    "type of input {} must be {name} but found type {}",
                                    quote(&input.name.value),
                                    one.ty.describe()
                                ),
                            );
                        }
                        if let Some(inputs) = &mut self.inputs {
                            inputs
                                .props
                                .insert(input.id.clone(), input_type(input.kind));
                        }
                    }
                    if let Some(declared) = &call.secrets {
                        let mut secrets = ObjectType::strict();
                        for (id, secret) in declared {
                            secrets.props.insert(id.clone(), ExprType::String);
                            self.check_string(secret.description.as_ref(), "");
                        }
                        self.secrets = Some(secrets);
                    }
                    for output in call.outputs.values() {
                        self.check_string(output.description.as_ref(), "");
                    }
                }
                Event::ImageVersion {
                    names, versions, ..
                } => {
                    self.check_strings(names, "");
                    self.check_strings(versions, "");
                }
            }
        }
    }
}

impl Rule for Expression {
    fn name(&self) -> &'static str {
        "expression"
    }

    fn report(&mut self) -> &mut Report {
        &mut self.report
    }

    fn visit_workflow_pre(&mut self, workflow: &Workflow) {
        self.check_string(workflow.name.as_ref(), "");
        self.check_events(workflow.on.as_deref().unwrap_or_default());
        self.check_string(workflow.run_name.as_ref(), "run-name");
        self.check_env(workflow.env.as_ref(), "env");
        self.check_defaults(workflow.defaults.as_ref(), "");
        self.check_concurrency(workflow.concurrency.as_ref(), "concurrency");
        self.workflow_jobs = workflow
            .jobs
            .iter()
            .flatten()
            .map(|(id, job)| {
                (
                    id.clone(),
                    job.workflow_call.as_ref().map_or_else(
                        || JobInfo::Steps {
                            outputs: job.outputs.keys().cloned().collect(),
                        },
                        |call| JobInfo::Call {
                            uses: call.uses.clone(),
                        },
                    ),
                )
            })
            .collect();
    }

    fn visit_workflow_post(&mut self, workflow: &Workflow) {
        if let Some(call) = workflow.workflow_call_event() {
            self.check_call_outputs(&call.outputs, workflow);
        }
        self.workflow_jobs.clear();
    }

    fn visit_job_pre(&mut self, job: &Job) {
        self.needs = Some(self.needs_type(job));
        if let Some(matrix) = job.strategy.as_ref().and_then(|s| s.matrix.as_ref()) {
            self.matrix = Some(self.check_matrix(matrix));
        }
        self.check_string(job.name.as_ref(), "jobs.<job_id>.name");
        self.check_strings(&job.needs, "");
        if let Some(runs_on) = &job.runs_on {
            if let Some(labels) = &runs_on.labels_expr {
                if let Some(ty) = self.check_one(
                    Some(labels),
                    "runner label at \"runs-on\" section",
                    "jobs.<job_id>.runs-on",
                ) && !matches!(ty, ExprType::Array(_) | ExprType::String | ExprType::Any)
                {
                    self.error(
                        labels.pos,
                        format!(
                            "type of expression at \"runs-on\" must be string or array but found type {}",
                            quote(&ty.describe())
                        ),
                    );
                }
            } else {
                for label in &runs_on.labels {
                    self.check_string(Some(label), "jobs.<job_id>.runs-on");
                }
            }
            self.check_string(runs_on.group.as_ref(), "jobs.<job_id>.runs-on");
        }
        self.check_concurrency(job.concurrency.as_ref(), "jobs.<job_id>.concurrency");
        self.check_env(job.env.as_ref(), "jobs.<job_id>.env");
        self.check_defaults(job.defaults.as_ref(), "jobs.<job_id>.defaults.run");
        self.check_if(job.condition.as_ref(), "jobs.<job_id>.if");
        if let Some(strategy) = &job.strategy {
            self.check_bool(strategy.fail_fast.as_ref(), "jobs.<job_id>.strategy");
            self.check_int(strategy.max_parallel.as_ref(), "jobs.<job_id>.strategy");
        }
        self.check_bool(
            job.continue_on_error.as_ref(),
            "jobs.<job_id>.continue-on-error",
        );
        self.check_float(
            job.timeout_minutes.as_ref(),
            "jobs.<job_id>.timeout-minutes",
        );
        self.check_container(job.container.as_ref(), "jobs.<job_id>.container", "");
        if let Some(services) = &job.services {
            self.check_object_expr(
                services.expression.as_ref(),
                "services",
                "jobs.<job_id>.services",
            );
            for service in services.value.values() {
                self.check_container(
                    Some(&service.container),
                    "jobs.<job_id>.services",
                    "<service_id>",
                );
            }
        }
        self.check_workflow_call(job.workflow_call.as_ref());
        self.check_snapshot(job.snapshot.as_ref());
        self.steps = Some(ObjectType::strict());
    }

    fn visit_job_post(&mut self, job: &Job) {
        if let Some(environment) = &job.environment {
            self.check_string(environment.name.as_ref(), "jobs.<job_id>.environment");
            self.check_string(environment.url.as_ref(), "jobs.<job_id>.environment.url");
            self.check_bool(environment.deployment.as_ref(), "jobs.<job_id>.environment");
        }
        for output in job.outputs.values() {
            self.check_string(Some(&output.value), "jobs.<job_id>.outputs.<output_id>");
        }
        self.matrix = None;
        self.steps = None;
        self.needs = None;
    }

    fn visit_step(&mut self, step: &Step) {
        self.check_string(step.name.as_ref(), "jobs.<job_id>.steps.name");
        self.check_if(step.condition.as_ref(), "jobs.<job_id>.steps.if");
        let mut uses = None;
        match &step.exec {
            Some(Exec::Run(run)) => {
                self.check_script(run.run.as_ref(), "jobs.<job_id>.steps.run");
                self.check_string(run.shell.as_ref(), "");
                self.check_string(
                    run.working_directory.as_ref(),
                    "jobs.<job_id>.steps.working-directory",
                );
            }
            Some(Exec::Action(action)) => {
                self.check_string(action.uses.as_ref(), "");
                let github_script = action
                    .uses
                    .as_ref()
                    .is_some_and(|u| u.value.starts_with("actions/github-script@"));
                for (id, input) in action.inputs.iter().flatten() {
                    if github_script && id == "script" {
                        self.check_script(Some(&input.value), "jobs.<job_id>.steps.with");
                    } else {
                        self.check_string(Some(&input.value), "jobs.<job_id>.steps.with");
                    }
                }
                self.check_string(action.entrypoint.as_ref(), "jobs.<job_id>.steps.with");
                self.check_string(action.args.as_ref(), "jobs.<job_id>.steps.with");
                uses.clone_from(&action.uses);
            }
            None => {}
        }
        self.check_env(step.env.as_ref(), "jobs.<job_id>.steps.env");
        self.check_bool(
            step.continue_on_error.as_ref(),
            "jobs.<job_id>.steps.continue-on-error",
        );
        self.check_float(
            step.timeout_minutes.as_ref(),
            "jobs.<job_id>.steps.timeout-minutes",
        );
        if let Some(id) = &step.id {
            if id.contains_expression() {
                self.check_string(Some(id), "");
                if let Some(steps) = &mut self.steps {
                    steps.set_loose();
                }
            }
            let outputs = self.action_outputs_of(uses.as_ref());
            if let Some(steps) = &mut self.steps {
                steps.props.insert(
                    id.value.to_lowercase(),
                    ExprType::Object(strict([
                        ("outputs".to_owned(), ExprType::Object(outputs)),
                        ("conclusion".to_owned(), ExprType::String),
                        ("outcome".to_owned(), ExprType::String),
                    ])),
                );
            }
        }
    }
}
