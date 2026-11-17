use std::collections::{BTreeMap, HashMap};
use std::rc::Rc;

use super::model::{
    Bool, CallEventInput, CallEventOutput, CallEventSecret, CallInputType, CallValue, Concurrency,
    Container, Credentials, Defaults, DefaultsRun, DispatchInput, DispatchInputType, Env, EnvVar,
    Environment, Event, EventFilter, Exec, ExecAction, ExecRun, Float, Input, Int, Job, Matrix,
    MatrixAssign, MatrixCombination, MatrixCombinations, MatrixRow, Output, PermissionScope,
    Permissions, RawValue, Runner, ScheduleEntry, Service, Services, Snapshot, Step, Strategy,
    Text, WebhookEvent, Workflow, WorkflowCall, WorkflowCallEvent, is_expression_assigned,
};
use crate::shared::diagnostic::Diagnostic;
use crate::shared::text::{quote, sorted_quotes};
use crate::shared::yaml::{Kind, Node, Pos, load, parse_go_float};

const KIND: &str = "syntax-check";
const JOB_KEYS: &[&str] = &[
    "name",
    "needs",
    "runs-on",
    "permissions",
    "environment",
    "concurrency",
    "outputs",
    "env",
    "defaults",
    "if",
    "steps",
    "timeout-minutes",
    "strategy",
    "continue-on-error",
    "container",
    "services",
    "uses",
    "with",
    "secrets",
    "snapshot",
];

struct Entry {
    id: String,
    key: Text,
    val: Rc<Node>,
}

fn text_of(node: &Node) -> Text {
    Text {
        value: node.value.clone(),
        quoted: node.is_quoted(),
        pos: node.pos,
    }
}

fn go_number(value: f64) -> String {
    crate::shared::text::go_float(value)
}

#[derive(Default)]
struct Parser {
    errors: Vec<Diagnostic>,
}

impl Parser {
    fn error_at(&mut self, pos: Pos, message: String) {
        self.errors.push(Diagnostic::new(pos, KIND, message));
    }

    fn error(&mut self, node: &Node, message: String) {
        self.error_at(node.pos, message);
    }

    fn unexpected_key(&mut self, key: &Text, section: &str, expected: &[&str]) {
        let section = if section.contains(' ') {
            section.to_owned()
        } else {
            format!("{} section", quote(section))
        };
        let message = match expected {
            [one] => format!(
                "expected {} key for {section} but got {}",
                quote(one),
                quote(&key.value)
            ),
            [] => format!("unexpected key {} for {section}", quote(&key.value)),
            many => format!(
                "unexpected key {} for {section}. expected one of {}",
                quote(&key.value),
                sorted_quotes(many)
            ),
        };
        self.error_at(key.pos, message);
    }

    fn check_not_empty(&mut self, section: &str, len: usize, node: &Node) -> bool {
        if len == 0 {
            self.error(
                node,
                format!("{} section should not be empty", quote(section)),
            );
            return false;
        }
        true
    }

    fn check_sequence(&mut self, section: &str, node: &Node, allow_empty: bool) -> bool {
        if node.kind != Kind::Sequence {
            self.error(
                node,
                format!(
                    "{} section must be sequence node but got {} node with {} tag",
                    quote(section),
                    node.kind.name(),
                    quote(&node.tag)
                ),
            );
            return false;
        }
        allow_empty || self.check_not_empty(section, node.content.len(), node)
    }

    fn check_string(&mut self, node: &Node, allow_empty: bool) -> bool {
        if node.kind != Kind::Scalar {
            self.error(
                node,
                format!(
                    "expected scalar node for string value but found {} node with {} tag",
                    node.kind.name(),
                    quote(&node.tag)
                ),
            );
            return false;
        }
        if !allow_empty && node.value.is_empty() {
            self.error(node, "string should not be empty".to_owned());
            return false;
        }
        true
    }

    fn missing_expression(&mut self, node: &Node, expecting: &str) {
        self.error(
            node,
            format!("expecting a single ${{{{...}}}} expression or {expecting}, but found plain text node"),
        );
    }

    fn parse_expression(&mut self, node: &Node, expecting: &str) -> Option<Text> {
        if !is_expression_assigned(&node.value) {
            self.missing_expression(node, expecting);
            return None;
        }
        Some(text_of(node))
    }

    fn may_parse_expression(node: &Node) -> Option<Text> {
        (node.tag == "!!str" && is_expression_assigned(&node.value)).then(|| text_of(node))
    }

    fn parse_string(&mut self, node: &Node, allow_empty: bool) -> Text {
        if !self.check_string(node, allow_empty) {
            return Text {
                value: String::new(),
                quoted: false,
                pos: node.pos,
            };
        }
        text_of(node)
    }

    fn parse_string_sequence(
        &mut self,
        section: &str,
        node: &Node,
        allow_empty: bool,
        allow_elem_empty: bool,
    ) -> Vec<Text> {
        if !self.check_sequence(section, node, allow_empty) {
            return Vec::new();
        }
        node.content
            .iter()
            .map(|child| self.parse_string(child, allow_elem_empty))
            .collect()
    }

    fn parse_string_or_sequence(
        &mut self,
        section: &str,
        node: &Node,
        allow_empty: bool,
        allow_elem_empty: bool,
    ) -> Vec<Text> {
        if node.kind == Kind::Scalar {
            if allow_empty && node.tag == "!!null" {
                return Vec::new();
            }
            return vec![self.parse_string(node, allow_elem_empty)];
        }
        self.parse_string_sequence(section, node, allow_empty, allow_elem_empty)
    }

    fn parse_bool(&mut self, node: &Node) -> Option<Bool> {
        if node.kind != Kind::Scalar || (node.tag != "!!bool" && node.tag != "!!str") {
            self.error(
                node,
                format!(
                    "expected bool value but found {} node with {} tag",
                    node.kind.name(),
                    quote(&node.tag)
                ),
            );
            return None;
        }
        if node.tag == "!!str" {
            let expression = self.parse_expression(node, "boolean literal \"true\" or \"false\"");
            return Some(Bool {
                value: false,
                expression,
                pos: node.pos,
            });
        }
        Some(Bool {
            value: node.value == "true",
            expression: None,
            pos: node.pos,
        })
    }

    fn parse_int(&mut self, node: &Node) -> Option<Int> {
        if node.kind != Kind::Scalar || (node.tag != "!!int" && node.tag != "!!str") {
            self.error(
                node,
                format!(
                    "expected scalar node for integer value but found {} node with {} tag",
                    node.kind.name(),
                    quote(&node.tag)
                ),
            );
            return None;
        }
        if node.tag == "!!str" {
            let expression = self.parse_expression(node, "integer literal")?;
            return Some(Int {
                value: 0,
                expression: Some(expression),
            });
        }
        match atoi(&node.value) {
            Ok(value) => Some(Int {
                value,
                expression: None,
            }),
            Err(reason) => {
                self.error(
                    node,
                    format!(
                        "invalid integer value: {}: strconv.Atoi: parsing {}: {reason}",
                        quote(&node.value),
                        quote(&node.value)
                    ),
                );
                None
            }
        }
    }

    fn parse_float(&mut self, node: &Node) -> Option<Float> {
        if node.kind != Kind::Scalar || !matches!(node.tag.as_str(), "!!float" | "!!int" | "!!str")
        {
            self.error(
                node,
                format!(
                    "expected scalar node for float value but found {} node with {} tag",
                    node.kind.name(),
                    quote(&node.tag)
                ),
            );
            return None;
        }
        if node.tag == "!!str" {
            let expression = self.parse_expression(node, "float number literal")?;
            return Some(Float {
                value: 0.0,
                expression: Some(expression),
            });
        }
        match parse_go_float(&node.value) {
            Some(value) if !value.is_nan() => Some(Float {
                value,
                expression: None,
            }),
            _ => {
                self.error(
                    node,
                    format!(
                        "invalid float value: {}: strconv.ParseFloat: parsing {}: invalid syntax",
                        quote(&node.value),
                        quote(&node.value)
                    ),
                );
                None
            }
        }
    }

    fn parse_mapping(
        &mut self,
        place: &str,
        node: &Node,
        allow_empty: bool,
        case_sensitive: bool,
    ) -> Vec<Entry> {
        let mut entries = Vec::new();
        if node.kind == Kind::Scalar && node.tag == "!!null" {
            if !allow_empty {
                self.error(
                    node,
                    format!("{place} should not be empty. please remove this section if it's unnecessary"),
                );
            }
            return entries;
        }
        if node.kind != Kind::Mapping {
            self.error(
                node,
                format!(
                    "{place} is {} node but mapping node is expected",
                    node.kind.name()
                ),
            );
            return entries;
        }
        let mut keys: HashMap<String, Pos> = HashMap::new();
        for (key_node, value) in node.pairs() {
            let key = self.parse_string(key_node, false);
            if key.value == "<<" {
                self.error_at(
                    key.pos,
                    "GitHub Actions does not support YAML merge key \"<<\"".to_owned(),
                );
                continue;
            }
            let id = if case_sensitive {
                key.value.clone()
            } else {
                key.value.to_lowercase()
            };
            if let Some(previous) = keys.get(&id) {
                let note = if case_sensitive {
                    ""
                } else {
                    ". note that this key is case insensitive"
                };
                let message = format!(
                    "key {} is duplicated in {place}. previously defined at {}{note}",
                    quote(&key.value),
                    previous.describe()
                );
                self.error_at(key.pos, message);
                continue;
            }
            keys.insert(id.clone(), key.pos);
            entries.push(Entry {
                id,
                key,
                val: Rc::clone(value),
            });
        }
        if !allow_empty && entries.is_empty() {
            self.error(
                node,
                format!(
                    "{place} should not be empty. please remove this section if it's unnecessary"
                ),
            );
        }
        entries
    }

    fn parse_section(
        &mut self,
        section: &str,
        node: &Node,
        allow_empty: bool,
        case_sensitive: bool,
    ) -> Vec<Entry> {
        self.parse_mapping(
            &format!("{} section", quote(section)),
            node,
            allow_empty,
            case_sensitive,
        )
    }

    fn parse_schedule(&mut self, node: &Node) -> Option<Event> {
        if !self.check_sequence("schedule", node, false) {
            return None;
        }
        let mut schedules = Vec::new();
        for child in &node.content {
            let mut cron = None;
            let mut timezone = None;
            for entry in self.parse_mapping("element of \"schedule\" section", child, false, true) {
                match entry.id.as_str() {
                    "cron" => {
                        let value = self.parse_string(&entry.val, false);
                        if !value.value.is_empty() {
                            cron = Some(value);
                        }
                    }
                    "timezone" => {
                        let value = self.parse_string(&entry.val, false);
                        if !value.value.is_empty() {
                            timezone = Some(value);
                        }
                    }
                    _ => self.unexpected_key(
                        &entry.key,
                        "element of \"schedule\" section",
                        &["cron", "timezone"],
                    ),
                }
            }
            if let Some(cron) = cron {
                schedules.push(ScheduleEntry { cron, timezone });
            }
        }
        Some(Event::Schedule { schedules })
    }

    fn parse_dispatch_input(&mut self, name: Text, node: &Node) -> DispatchInput {
        let mut input = DispatchInput {
            name,
            description: None,
            required: None,
            default: None,
            kind: DispatchInputType::None,
            options: Vec::new(),
        };
        for entry in self.parse_mapping(
            "input settings of workflow_dispatch event",
            node,
            true,
            true,
        ) {
            match entry.id.as_str() {
                "description" => input.description = Some(self.parse_string(&entry.val, true)),
                "required" => input.required = self.parse_bool(&entry.val),
                "default" => input.default = Some(self.parse_string(&entry.val, true)),
                "type" => {
                    if !self.check_string(&entry.val, false) {
                        continue;
                    }
                    input.kind = match entry.val.value.as_str() {
                        "string" => DispatchInputType::String,
                        "number" => DispatchInputType::Number,
                        "boolean" => DispatchInputType::Boolean,
                        "choice" => DispatchInputType::Choice,
                        "environment" => DispatchInputType::Environment,
                        other => {
                            self.error(
                                &entry.val,
                                format!(
                                    "input type of workflow_dispatch event must be one of \"string\", \"number\", \"boolean\", \"choice\", \"environment\" but got {}",
                                    quote(other)
                                ),
                            );
                            input.kind
                        }
                    };
                }
                "options" => {
                    input.options = self.parse_string_sequence("options", &entry.val, false, false);
                }
                _ => self.unexpected_key(
                    &entry.key,
                    "inputs",
                    &["description", "required", "default"],
                ),
            }
        }
        input
    }

    fn parse_workflow_dispatch(&mut self, pos: Pos, node: &Node) -> Event {
        let mut inputs = BTreeMap::new();
        for entry in self.parse_section("workflow_dispatch", node, true, true) {
            if entry.id != "inputs" {
                self.unexpected_key(&entry.key, "workflow_dispatch", &["inputs"]);
                continue;
            }
            inputs = BTreeMap::new();
            for input in self.parse_section("inputs", &entry.val, true, false) {
                let parsed = self.parse_dispatch_input(input.key, &input.val);
                inputs.insert(input.id, parsed);
            }
        }
        Event::WorkflowDispatch { inputs, pos }
    }

    fn parse_repository_dispatch(&mut self, node: &Node) -> Event {
        let mut types = Vec::new();
        for entry in self.parse_section("repository_dispatch", node, true, true) {
            if entry.id == "types" {
                types = self.parse_string_or_sequence("types", &entry.val, false, false);
            } else {
                self.unexpected_key(&entry.key, "repository_dispatch", &["types"]);
            }
        }
        Event::RepositoryDispatch { types }
    }

    fn parse_filter(&mut self, name: Text, node: &Node) -> EventFilter {
        let values = self.parse_string_or_sequence(&name.value, node, false, false);
        EventFilter { name, values }
    }

    fn parse_webhook(&mut self, name: &Text, node: &Node) -> Event {
        let mut hook = WebhookEvent {
            pos: name.pos,
            hook: name.clone(),
            types: Vec::new(),
            branches: None,
            branches_ignore: None,
            tags: None,
            tags_ignore: None,
            paths: None,
            paths_ignore: None,
            workflows: Vec::new(),
        };
        for entry in self.parse_section(&name.value, node, true, true) {
            match entry.id.as_str() {
                "types" => {
                    hook.types =
                        self.parse_string_or_sequence(&entry.key.value, &entry.val, false, false);
                }
                "branches" => hook.branches = Some(self.parse_filter(entry.key, &entry.val)),
                "branches-ignore" => {
                    hook.branches_ignore = Some(self.parse_filter(entry.key, &entry.val));
                }
                "tags" => hook.tags = Some(self.parse_filter(entry.key, &entry.val)),
                "tags-ignore" => hook.tags_ignore = Some(self.parse_filter(entry.key, &entry.val)),
                "paths" => hook.paths = Some(self.parse_filter(entry.key, &entry.val)),
                "paths-ignore" => {
                    hook.paths_ignore = Some(self.parse_filter(entry.key, &entry.val));
                }
                "workflows" => {
                    hook.workflows =
                        self.parse_string_or_sequence(&entry.key.value, &entry.val, false, false);
                }
                _ => self.unexpected_key(
                    &entry.key,
                    &name.value,
                    &[
                        "types",
                        "branches",
                        "branches-ignore",
                        "tags",
                        "tags-ignore",
                        "paths",
                        "paths-ignore",
                        "workflows",
                    ],
                ),
            }
        }
        Event::Webhook(Box::new(hook))
    }

    fn parse_call_input(&mut self, id: String, name: Text, node: &Node) -> CallEventInput {
        let mut input = CallEventInput {
            name,
            description: None,
            default: None,
            required: None,
            kind: CallInputType::Invalid,
            id,
        };
        let mut typed = false;
        for entry in self.parse_mapping("input of workflow_call event", node, true, true) {
            match entry.id.as_str() {
                "description" => input.description = Some(self.parse_string(&entry.val, true)),
                "required" => input.required = self.parse_bool(&entry.val),
                "default" => input.default = Some(self.parse_string(&entry.val, true)),
                "type" => {
                    typed = true;
                    if !self.check_string(&entry.val, false) {
                        continue;
                    }
                    match entry.val.value.as_str() {
                        "boolean" => input.kind = CallInputType::Boolean,
                        "number" => input.kind = CallInputType::Number,
                        "string" => input.kind = CallInputType::String,
                        other => self.error(
                            &entry.val,
                            format!(
                                "invalid value {} for input type of workflow_call event. it must be one of \"boolean\", \"number\", or \"string\"",
                                quote(other)
                            ),
                        ),
                    }
                }
                _ => self.unexpected_key(
                    &entry.key,
                    "inputs at workflow_call event",
                    &["description", "required", "default", "type"],
                ),
            }
        }
        if !typed {
            let message = format!(
                "\"type\" is missing at {} input of workflow_call event",
                quote(&input.name.value)
            );
            self.error_at(input.name.pos, message);
        }
        input
    }

    fn parse_call_secret(&mut self, name: Text, node: &Node) -> CallEventSecret {
        let mut secret = CallEventSecret {
            name,
            description: None,
            required: None,
        };
        for entry in self.parse_mapping("secret of workflow_call event", node, true, true) {
            match entry.id.as_str() {
                "description" => secret.description = Some(self.parse_string(&entry.val, true)),
                "required" => secret.required = self.parse_bool(&entry.val),
                _ => self.unexpected_key(&entry.key, "secrets", &["description", "required"]),
            }
        }
        secret
    }

    fn parse_call_output(&mut self, name: Text, node: &Node) -> CallEventOutput {
        let mut output = CallEventOutput {
            name,
            description: None,
            value: None,
        };
        for entry in self.parse_mapping("output of workflow_call event", node, true, true) {
            match entry.id.as_str() {
                "description" => output.description = Some(self.parse_string(&entry.val, true)),
                "value" => output.value = Some(self.parse_string(&entry.val, false)),
                _ => self.unexpected_key(
                    &entry.key,
                    "outputs at workflow_call event",
                    &["description", "value"],
                ),
            }
        }
        if output.value.is_none() {
            let message = format!(
                "\"value\" is missing at {} output of workflow_call event",
                quote(&output.name.value)
            );
            self.error_at(output.name.pos, message);
        }
        output
    }

    fn parse_workflow_call(&mut self, pos: Pos, node: &Node) -> Event {
        let mut call = WorkflowCallEvent {
            pos,
            ..WorkflowCallEvent::default()
        };
        for entry in self.parse_section("workflow_call", node, true, true) {
            match entry.id.as_str() {
                "inputs" => {
                    call.inputs = Vec::new();
                    for input in self.parse_section("inputs", &entry.val, true, false) {
                        let parsed = self.parse_call_input(input.id, input.key, &input.val);
                        call.inputs.push(parsed);
                    }
                }
                "secrets" => {
                    let mut secrets = BTreeMap::new();
                    for secret in self.parse_section("secrets", &entry.val, true, false) {
                        let parsed = self.parse_call_secret(secret.key, &secret.val);
                        secrets.insert(secret.id, parsed);
                    }
                    call.secrets = Some(secrets);
                }
                "outputs" => {
                    call.outputs = BTreeMap::new();
                    for output in self.parse_section("outputs", &entry.val, true, false) {
                        let parsed = self.parse_call_output(output.key, &output.val);
                        call.outputs.insert(output.id, parsed);
                    }
                }
                _ => self.unexpected_key(
                    &entry.key,
                    "workflow_call",
                    &["inputs", "secrets", "outputs"],
                ),
            }
        }
        Event::WorkflowCall(call)
    }

    fn parse_image_version(&mut self, node: &Node) -> Event {
        let mut names = Vec::new();
        let mut versions = Vec::new();
        for entry in self.parse_section("image_version", node, true, true) {
            match entry.id.as_str() {
                "names" => names = self.parse_string_sequence("names", &entry.val, false, false),
                "versions" => {
                    versions = self.parse_string_sequence("versions", &entry.val, false, false);
                }
                _ => self.unexpected_key(&entry.key, "image_version", &["names", "versions"]),
            }
        }
        Event::ImageVersion { names, versions }
    }

    fn parse_event_without_config(&mut self, node: &Node) -> Option<Event> {
        let name = self.parse_string(node, false);
        let pos = node.pos;
        match name.value.as_str() {
            "" => None,
            "schedule" => {
                self.error(
                    node,
                    "schedule event must be configured with mapping".to_owned(),
                );
                None
            }
            "repository_dispatch" => Some(Event::RepositoryDispatch { types: Vec::new() }),
            "workflow_dispatch" => Some(Event::WorkflowDispatch {
                inputs: BTreeMap::new(),
                pos,
            }),
            "workflow_call" => Some(Event::WorkflowCall(WorkflowCallEvent {
                pos,
                ..WorkflowCallEvent::default()
            })),
            "image_version" => Some(Event::ImageVersion {
                names: Vec::new(),
                versions: Vec::new(),
            }),
            _ => Some(Event::Webhook(Box::new(WebhookEvent {
                hook: name,
                types: Vec::new(),
                branches: None,
                branches_ignore: None,
                tags: None,
                tags_ignore: None,
                paths: None,
                paths_ignore: None,
                workflows: Vec::new(),
                pos,
            }))),
        }
    }

    fn parse_events(&mut self, node: &Node) -> Option<Vec<Event>> {
        match node.kind {
            Kind::Scalar => Some(self.parse_event_without_config(node).into_iter().collect()),
            Kind::Mapping => {
                let mut events = Vec::new();
                for entry in self.parse_section("on", node, false, true) {
                    let pos = entry.key.pos;
                    match entry.id.as_str() {
                        "schedule" => events.extend(self.parse_schedule(&entry.val)),
                        "workflow_dispatch" => {
                            events.push(self.parse_workflow_dispatch(pos, &entry.val));
                        }
                        "repository_dispatch" => {
                            events.push(self.parse_repository_dispatch(&entry.val));
                        }
                        "workflow_call" => events.push(self.parse_workflow_call(pos, &entry.val)),
                        "image_version" => events.push(self.parse_image_version(&entry.val)),
                        _ => events.push(self.parse_webhook(&entry.key, &entry.val)),
                    }
                }
                Some(events)
            }
            Kind::Sequence => {
                self.check_not_empty("on", node.content.len(), node);
                Some(
                    node.content
                        .iter()
                        .filter_map(|child| self.parse_event_without_config(child))
                        .collect(),
                )
            }
            Kind::Alias => {
                self.error(
                    node,
                    format!(
                        "\"on\" section value is expected to be mapping or sequence but found {} node",
                        node.kind.name()
                    ),
                );
                None
            }
        }
    }

    fn parse_permissions(&mut self, node: &Node) -> Permissions {
        if node.kind == Kind::Scalar {
            return Permissions {
                all: Some(self.parse_string(node, false)),
                scopes: BTreeMap::new(),
            };
        }
        let mut scopes = BTreeMap::new();
        for entry in self.parse_section("permissions", node, true, false) {
            let value = self.parse_string(&entry.val, false);
            scopes.insert(
                entry.id,
                PermissionScope {
                    name: entry.key,
                    value,
                },
            );
        }
        Permissions { all: None, scopes }
    }

    fn parse_env(&mut self, node: &Node) -> Env {
        if node.kind == Kind::Scalar {
            return Env {
                vars: BTreeMap::new(),
                expression: self.parse_expression(node, "mapping value for \"env\" section"),
            };
        }
        let mut vars = BTreeMap::new();
        for entry in self.parse_section("env", node, false, false) {
            let value = self.parse_string(&entry.val, true);
            vars.insert(
                entry.id,
                EnvVar {
                    name: entry.key,
                    value,
                },
            );
        }
        Env {
            vars,
            expression: None,
        }
    }

    fn parse_defaults(&mut self, node: &Node) -> Defaults {
        let mut defaults = Defaults { run: None };
        for entry in self.parse_section("defaults", node, false, true) {
            if entry.id != "run" {
                self.unexpected_key(&entry.key, "defaults", &["run"]);
                continue;
            }
            let mut run = DefaultsRun {
                shell: None,
                working_directory: None,
            };
            for item in self.parse_section("run", &entry.val, false, true) {
                match item.id.as_str() {
                    "shell" => run.shell = Some(self.parse_string(&item.val, false)),
                    "working-directory" => {
                        run.working_directory = Some(self.parse_string(&item.val, false));
                    }
                    _ => self.unexpected_key(&item.key, "run", &["shell", "working-directory"]),
                }
            }
            defaults.run = Some(run);
        }
        if defaults.run.is_none() {
            self.error(
                node,
                "\"defaults\" section should have \"run\" section".to_owned(),
            );
        }
        defaults
    }

    fn parse_concurrency(&mut self, pos: Pos, node: &Node) -> Concurrency {
        let mut concurrency = Concurrency {
            group: None,
            cancel_in_progress: None,
        };
        if node.kind == Kind::Scalar {
            concurrency.group = Some(self.parse_string(node, false));
            return concurrency;
        }
        for entry in self.parse_section("concurrency", node, false, true) {
            match entry.id.as_str() {
                "group" => concurrency.group = Some(self.parse_string(&entry.val, false)),
                "cancel-in-progress" => {
                    concurrency.cancel_in_progress = self.parse_bool(&entry.val);
                }
                _ => {
                    self.unexpected_key(
                        &entry.key,
                        "concurrency",
                        &["group", "cancel-in-progress"],
                    );
                }
            }
        }
        if concurrency.group.is_none() {
            self.error_at(
                pos,
                "group name is missing in \"concurrency\" section".to_owned(),
            );
        }
        concurrency
    }

    fn parse_environment(&mut self, pos: Pos, node: &Node) -> Environment {
        let mut environment = Environment {
            name: None,
            url: None,
            deployment: None,
        };
        if node.kind == Kind::Scalar {
            environment.name = Some(self.parse_string(node, false));
            return environment;
        }
        for entry in self.parse_section("environment", node, false, true) {
            match entry.id.as_str() {
                "name" => environment.name = Some(self.parse_string(&entry.val, false)),
                "url" => environment.url = Some(self.parse_string(&entry.val, false)),
                "deployment" => environment.deployment = self.parse_bool(&entry.val),
                _ => self.unexpected_key(&entry.key, "environment", &["deployment", "name", "url"]),
            }
        }
        if environment.name.is_none() {
            self.error_at(pos, "name is missing in \"environment\" section".to_owned());
        }
        environment
    }

    fn parse_outputs(&mut self, node: &Node) -> BTreeMap<String, Output> {
        let mut outputs = BTreeMap::new();
        for entry in self.parse_section("outputs", node, false, false) {
            let value = self.parse_string(&entry.val, true);
            outputs.insert(entry.id, Output { value });
        }
        self.check_not_empty("outputs", outputs.len(), node);
        outputs
    }

    fn parse_raw_value(&mut self, node: &Node) -> Option<RawValue> {
        match node.kind {
            Kind::Scalar => Some(RawValue::String {
                value: node.value.clone(),
                pos: node.pos,
            }),
            Kind::Sequence => Some(RawValue::Array {
                elems: node
                    .content
                    .iter()
                    .filter_map(|child| self.parse_raw_value(child))
                    .collect(),
                pos: node.pos,
            }),
            Kind::Mapping => {
                let mut props = BTreeMap::new();
                for entry in self.parse_mapping("matrix row value", node, true, false) {
                    if let Some(value) = self.parse_raw_value(&entry.val) {
                        props.insert(entry.id, value);
                    }
                }
                Some(RawValue::Object {
                    props,
                    pos: node.pos,
                })
            }
            Kind::Alias => {
                self.error(
                    node,
                    format!(
                        "unexpected {} node on parsing value in matrix row",
                        node.kind.name()
                    ),
                );
                None
            }
        }
    }

    fn parse_combinations(&mut self, section: &str, node: &Node) -> Option<MatrixCombinations> {
        if node.kind == Kind::Scalar {
            return Some(MatrixCombinations {
                combinations: Vec::new(),
                expression: self.parse_expression(node, "array of matrix combination"),
            });
        }
        if !self.check_sequence(section, node, false) {
            return None;
        }
        let mut combinations = Vec::new();
        for child in &node.content {
            if child.kind == Kind::Scalar {
                if let Some(expression) =
                    self.parse_expression(child, "mapping of matrix combination")
                {
                    combinations.push(MatrixCombination {
                        assigns: BTreeMap::new(),
                        expression: Some(expression),
                    });
                }
                continue;
            }
            let mut assigns = BTreeMap::new();
            for entry in self.parse_mapping(
                &format!("element in {} section", quote(section)),
                child,
                false,
                false,
            ) {
                if let Some(value) = self.parse_raw_value(&entry.val) {
                    assigns.insert(
                        entry.id,
                        MatrixAssign {
                            key: entry.key,
                            value,
                        },
                    );
                }
            }
            combinations.push(MatrixCombination {
                assigns,
                expression: None,
            });
        }
        Some(MatrixCombinations {
            combinations,
            expression: None,
        })
    }

    fn parse_matrix(&mut self, pos: Pos, node: &Node) -> Matrix {
        if node.kind == Kind::Scalar {
            return Matrix {
                rows: BTreeMap::new(),
                include: None,
                exclude: None,
                expression: self.parse_expression(node, "matrix"),
                pos: node.pos,
            };
        }
        let mut matrix = Matrix {
            rows: BTreeMap::new(),
            include: None,
            exclude: None,
            expression: None,
            pos,
        };
        for entry in self.parse_section("matrix", node, false, false) {
            match entry.id.as_str() {
                "include" => matrix.include = self.parse_combinations("include", &entry.val),
                "exclude" => matrix.exclude = self.parse_combinations("exclude", &entry.val),
                _ => {
                    if entry.val.kind == Kind::Scalar {
                        let expression =
                            self.parse_expression(&entry.val, "array value for matrix variations");
                        matrix.rows.insert(
                            entry.id,
                            MatrixRow {
                                name: None,
                                values: Vec::new(),
                                expression,
                            },
                        );
                        continue;
                    }
                    if !self.check_sequence("matrix values", &entry.val, false) {
                        continue;
                    }
                    let values = entry
                        .val
                        .content
                        .iter()
                        .filter_map(|child| self.parse_raw_value(child))
                        .collect();
                    matrix.rows.insert(
                        entry.id,
                        MatrixRow {
                            name: Some(entry.key),
                            values,
                            expression: None,
                        },
                    );
                }
            }
        }
        matrix
    }

    fn parse_strategy(&mut self, node: &Node) -> Strategy {
        let mut strategy = Strategy {
            matrix: None,
            fail_fast: None,
            max_parallel: None,
        };
        for entry in self.parse_section("strategy", node, false, true) {
            match entry.id.as_str() {
                "matrix" => strategy.matrix = Some(self.parse_matrix(entry.key.pos, &entry.val)),
                "fail-fast" => strategy.fail_fast = self.parse_bool(&entry.val),
                "max-parallel" => {
                    let parsed = self.parse_int(&entry.val);
                    if let Some(int) = &parsed
                        && int.expression.is_none()
                        && int.value <= 0
                    {
                        self.error(
                            &entry.val,
                            format!(
                                "value at \"max-parallel\" must be greater than zero: {}",
                                int.value
                            ),
                        );
                    }
                    strategy.max_parallel = parsed;
                }
                _ => self.unexpected_key(
                    &entry.key,
                    "strategy",
                    &["matrix", "fail-fast", "max-parallel"],
                ),
            }
        }
        strategy
    }

    fn parse_credentials(&mut self, pos: Pos, node: &Node) -> Option<Credentials> {
        if let Some(expression) = Self::may_parse_expression(node) {
            return Some(Credentials {
                username: None,
                password: None,
                expression: Some(expression),
            });
        }
        let mut credentials = Credentials {
            username: None,
            password: None,
            expression: None,
        };
        for entry in self.parse_section("credentials", node, false, true) {
            match entry.id.as_str() {
                "username" => credentials.username = Some(self.parse_string(&entry.val, false)),
                "password" => credentials.password = Some(self.parse_string(&entry.val, false)),
                _ => self.unexpected_key(&entry.key, "credentials", &["username", "password"]),
            }
        }
        if credentials.username.is_none() || credentials.password.is_none() {
            self.error_at(
                pos,
                "both \"username\" and \"password\" must be specified in \"credentials\" section"
                    .to_owned(),
            );
            return None;
        }
        Some(credentials)
    }

    fn parse_container(&mut self, section: &str, pos: Pos, node: &Node) -> Container {
        let mut container = Container {
            image: None,
            credentials: None,
            env: None,
            ports: Vec::new(),
            volumes: Vec::new(),
            options: None,
        };
        if node.kind == Kind::Scalar {
            container.image = Some(self.parse_string(node, false));
            return container;
        }
        for entry in self.parse_section(section, node, false, true) {
            match entry.id.as_str() {
                "image" => container.image = Some(self.parse_string(&entry.val, false)),
                "credentials" => {
                    container.credentials = self.parse_credentials(entry.key.pos, &entry.val);
                }
                "env" => container.env = Some(self.parse_env(&entry.val)),
                "ports" => {
                    container.ports = self.parse_string_sequence("ports", &entry.val, true, false);
                }
                "volumes" => {
                    container.volumes =
                        self.parse_string_sequence("volumes", &entry.val, true, false);
                }
                "options" => container.options = Some(self.parse_string(&entry.val, true)),
                _ => self.unexpected_key(
                    &entry.key,
                    section,
                    &["image", "credentials", "env", "ports", "volumes", "options"],
                ),
            }
        }
        if container.image.is_none() {
            self.error_at(
                pos,
                format!("\"image\" is missing in {} section", quote(section)),
            );
        }
        container
    }

    fn parse_services(&mut self, node: &Node) -> Services {
        if let Some(expression) = Self::may_parse_expression(node) {
            return Services {
                value: BTreeMap::new(),
                expression: Some(expression),
            };
        }
        let mut value = BTreeMap::new();
        for entry in self.parse_section("services", node, false, false) {
            let container = self.parse_container("services", entry.key.pos, &entry.val);
            value.insert(
                entry.id,
                Service {
                    name: entry.key,
                    container,
                },
            );
        }
        Services {
            value,
            expression: None,
        }
    }

    fn parse_timeout_minutes(&mut self, node: &Node) -> Option<Float> {
        let parsed = self.parse_float(node);
        if let Some(float) = &parsed
            && float.expression.is_none()
            && float.value <= 0.0
        {
            self.error(
                node,
                format!(
                    "value at \"timeout-minutes\" must be greater than zero: {}",
                    go_number(float.value)
                ),
            );
        }
        parsed
    }

    fn parse_exec_action(&mut self, entries: &[Entry], is_docker: bool) -> ExecAction {
        let mut action = ExecAction::default();
        for entry in entries {
            match entry.id.as_str() {
                "uses" => action.uses = Some(self.parse_string(&entry.val, false)),
                "with" => {
                    let mut inputs = BTreeMap::new();
                    for item in self.parse_section("with", &entry.val, false, false) {
                        match item.id.as_str() {
                            "entrypoint" if is_docker => {
                                action.entrypoint = Some(self.parse_string(&item.val, false));
                            }
                            "args" if is_docker => {
                                action.args = Some(self.parse_string(&item.val, true));
                            }
                            _ => {
                                let value = self.parse_string(&item.val, true);
                                inputs.insert(
                                    item.id,
                                    Input {
                                        name: item.key,
                                        value,
                                    },
                                );
                            }
                        }
                    }
                    action.inputs = Some(inputs);
                }
                "id" | "if" | "name" | "env" | "continue-on-error" | "timeout-minutes" => {}
                _ => self.unexpected_key(
                    &entry.key,
                    "step to execute action",
                    &[
                        "id",
                        "if",
                        "name",
                        "env",
                        "continue-on-error",
                        "timeout-minutes",
                        "uses",
                        "with",
                    ],
                ),
            }
        }
        action
    }

    fn parse_exec_run(&mut self, entries: &[Entry]) -> ExecRun {
        let mut run = ExecRun {
            run: None,
            shell: None,
            working_directory: None,
            run_pos: None,
        };
        for entry in entries {
            match entry.id.as_str() {
                "run" => {
                    run.run = Some(self.parse_string(&entry.val, false));
                    run.run_pos = Some(entry.key.pos);
                }
                "shell" => run.shell = Some(self.parse_string(&entry.val, false)),
                "working-directory" => {
                    run.working_directory = Some(self.parse_string(&entry.val, false));
                }
                "id" | "if" | "name" | "env" | "continue-on-error" | "timeout-minutes" => {}
                _ => self.unexpected_key(
                    &entry.key,
                    "step to run shell command",
                    &[
                        "id",
                        "if",
                        "name",
                        "env",
                        "continue-on-error",
                        "timeout-minutes",
                        "run",
                        "shell",
                        "working-directory",
                    ],
                ),
            }
        }
        run
    }

    fn parse_step(&mut self, node: &Node) -> Step {
        #[derive(PartialEq)]
        enum Shape {
            Unknown,
            Action,
            Docker,
            Run,
        }
        let mut step = Step {
            id: None,
            condition: None,
            name: None,
            exec: None,
            env: None,
            continue_on_error: None,
            timeout_minutes: None,
        };
        let mut shape = Shape::Unknown;
        let entries = self.parse_mapping("element of \"steps\" section", node, false, true);
        for entry in &entries {
            match entry.id.as_str() {
                "id" => step.id = Some(self.parse_string(&entry.val, false)),
                "if" => step.condition = Some(self.parse_string(&entry.val, false)),
                "name" => step.name = Some(self.parse_string(&entry.val, true)),
                "env" => step.env = Some(self.parse_env(&entry.val)),
                "continue-on-error" => step.continue_on_error = self.parse_bool(&entry.val),
                "timeout-minutes" => step.timeout_minutes = self.parse_timeout_minutes(&entry.val),
                "uses" => {
                    shape = if entry.val.value.starts_with("docker://") {
                        Shape::Docker
                    } else {
                        Shape::Action
                    };
                }
                "run" => shape = Shape::Run,
                _ => {}
            }
        }
        match shape {
            Shape::Action | Shape::Docker => {
                step.exec = Some(Exec::Action(
                    self.parse_exec_action(&entries, shape == Shape::Docker),
                ));
            }
            Shape::Run => step.exec = Some(Exec::Run(self.parse_exec_run(&entries))),
            Shape::Unknown => self.error(
                node,
                "step must run script with \"run\" section or run action with \"uses\" section"
                    .to_owned(),
            ),
        }
        step
    }

    fn parse_steps(&mut self, node: &Node) -> Option<Vec<Step>> {
        if !self.check_sequence("steps", node, false) {
            return None;
        }
        Some(
            node.content
                .iter()
                .map(|child| self.parse_step(child))
                .collect(),
        )
    }

    fn parse_runs_on(&mut self, node: &Node) -> Runner {
        if let Some(expression) = Self::may_parse_expression(node) {
            return Runner {
                labels: Vec::new(),
                labels_expr: Some(expression),
                group: None,
            };
        }
        if matches!(node.kind, Kind::Scalar | Kind::Sequence) {
            return Runner {
                labels: self.parse_string_or_sequence("runs-on", node, false, false),
                labels_expr: None,
                group: None,
            };
        }
        let mut runner = Runner::default();
        for entry in self.parse_section("runs-on", node, false, true) {
            match entry.id.as_str() {
                "labels" => {
                    if let Some(expression) = Self::may_parse_expression(&entry.val) {
                        runner.labels_expr = Some(expression);
                        continue;
                    }
                    runner.labels =
                        self.parse_string_or_sequence("labels", &entry.val, false, false);
                }
                "group" => runner.group = Some(self.parse_string(&entry.val, false)),
                _ => self.unexpected_key(&entry.key, "runs-on", &["labels", "group"]),
            }
        }
        runner
    }

    fn parse_snapshot(&mut self, pos: Pos, node: &Node) -> Option<Snapshot> {
        match node.kind {
            Kind::Scalar => Some(Snapshot {
                image_name: Some(self.parse_string(node, false)),
                ..Snapshot::default()
            }),
            Kind::Mapping => {
                let mut snapshot = Snapshot::default();
                for entry in self.parse_section("on", node, false, true) {
                    match entry.id.as_str() {
                        "image-name" => {
                            snapshot.image_name = Some(self.parse_string(&entry.val, false));
                        }
                        "version" => snapshot.version = Some(self.parse_string(&entry.val, false)),
                        "if" => snapshot.condition = Some(self.parse_string(&entry.val, false)),
                        _ => self.unexpected_key(
                            &entry.key,
                            "snapshot",
                            &["image-name", "version", "if"],
                        ),
                    }
                }
                if snapshot.image_name.is_none() {
                    self.error_at(
                        pos,
                        "\"snapshot\" section must have \"image-name\" configuration".to_owned(),
                    );
                }
                Some(snapshot)
            }
            _ => {
                self.error(
                    node,
                    format!(
                        "\"snapshot\" section value must be string or mapping but found {} node",
                        node.kind.name()
                    ),
                );
                None
            }
        }
    }

    fn parse_call_values(&mut self, section: &str, node: &Node) -> BTreeMap<String, CallValue> {
        let mut values = BTreeMap::new();
        for entry in self.parse_section(section, node, false, false) {
            let value = self.parse_string(&entry.val, true);
            values.insert(
                entry.id,
                CallValue {
                    name: entry.key,
                    value,
                },
            );
        }
        values
    }

    fn parse_job(&mut self, id: &Text, node: &Node) -> Job {
        let mut job = Job {
            pos: id.pos,
            id: id.clone(),
            name: None,
            needs: Vec::new(),
            runs_on: None,
            permissions: None,
            environment: None,
            concurrency: None,
            outputs: BTreeMap::new(),
            env: None,
            defaults: None,
            condition: None,
            steps: None,
            timeout_minutes: None,
            strategy: None,
            continue_on_error: None,
            container: None,
            services: None,
            workflow_call: None,
            snapshot: None,
        };
        let mut call = WorkflowCall::default();
        let mut steps_only: Option<Text> = None;
        let mut call_only: Option<Text> = None;
        for entry in self.parse_mapping(&format!("{} job", quote(&id.value)), node, false, true) {
            let (key, value) = (entry.key, entry.val);
            match entry.id.as_str() {
                "name" => job.name = Some(self.parse_string(&value, true)),
                "needs" => {
                    job.needs = if value.kind == Kind::Scalar {
                        vec![self.parse_string(&value, false)]
                    } else {
                        self.parse_string_sequence("needs", &value, false, false)
                    };
                }
                "runs-on" => {
                    job.runs_on = Some(self.parse_runs_on(&value));
                    steps_only = Some(key);
                }
                "permissions" => job.permissions = Some(self.parse_permissions(&value)),
                "environment" => {
                    job.environment = Some(self.parse_environment(key.pos, &value));
                    steps_only = Some(key);
                }
                "concurrency" => job.concurrency = Some(self.parse_concurrency(key.pos, &value)),
                "outputs" => {
                    job.outputs = self.parse_outputs(&value);
                    steps_only = Some(key);
                }
                "env" => {
                    job.env = Some(self.parse_env(&value));
                    steps_only = Some(key);
                }
                "defaults" => {
                    job.defaults = Some(self.parse_defaults(&value));
                    steps_only = Some(key);
                }
                "if" => job.condition = Some(self.parse_string(&value, false)),
                "steps" => {
                    job.steps = self.parse_steps(&value);
                    steps_only = Some(key);
                }
                "timeout-minutes" => {
                    job.timeout_minutes = self.parse_timeout_minutes(&value);
                    steps_only = Some(key);
                }
                "strategy" => job.strategy = Some(self.parse_strategy(&value)),
                "continue-on-error" => {
                    job.continue_on_error = self.parse_bool(&value);
                    steps_only = Some(key);
                }
                "container" => {
                    job.container = Some(self.parse_container("container", key.pos, &value));
                    steps_only = Some(key);
                }
                "services" => job.services = Some(self.parse_services(&value)),
                "uses" => {
                    call.uses = Some(self.parse_string(&value, false));
                    call_only = Some(key);
                }
                "with" => {
                    call.inputs = self.parse_call_values("with", &value);
                    call_only = Some(key);
                }
                "secrets" => {
                    self.parse_call_secrets(&mut call, &value);
                    call_only = Some(key);
                }
                "snapshot" => job.snapshot = self.parse_snapshot(key.pos, &value),
                _ => self.unexpected_key(&key, "job", JOB_KEYS),
            }
        }
        self.finish_job(id, job, call, steps_only, call_only)
    }

    fn parse_call_secrets(&mut self, call: &mut WorkflowCall, value: &Node) {
        if value.kind != Kind::Scalar {
            call.secrets = self.parse_call_values("secrets", value);
        } else if value.value == "inherit" {
            call.inherit_secrets = true;
        } else {
            self.error(
                value,
                format!(
                    "expected mapping node for secrets or \"inherit\" string node but found {} node",
                    quote(&value.value)
                ),
            );
        }
    }

    fn finish_job(
        &mut self,
        id: &Text,
        mut job: Job,
        call: WorkflowCall,
        steps_only: Option<Text>,
        call_only: Option<Text>,
    ) -> Job {
        if call.uses.is_some() {
            if let Some(key) = steps_only {
                let message = format!(
                    "when a reusable workflow is called with \"uses\", {} is not available. only following keys are allowed: \"name\", \"uses\", \"with\", \"secrets\", \"needs\", \"if\", and \"permissions\" in job {}",
                    quote(&key.value),
                    quote(&id.value)
                );
                self.error_at(key.pos, message);
            } else {
                job.workflow_call = Some(call);
            }
        } else {
            if job.steps.is_none() {
                self.error_at(
                    id.pos,
                    format!("\"steps\" section is missing in job {}", quote(&id.value)),
                );
            }
            if job.runs_on.is_none() {
                self.error_at(
                    id.pos,
                    format!("\"runs-on\" section is missing in job {}", quote(&id.value)),
                );
            }
            if let Some(key) = call_only {
                let message = format!(
                    "{} is only available for a reusable workflow call with \"uses\" but \"uses\" is not found in job {}",
                    quote(&key.value),
                    quote(&id.value)
                );
                self.error_at(key.pos, message);
            }
        }
        job
    }

    fn parse_workflow(&mut self, root: &Node) -> Workflow {
        let mut workflow = Workflow::default();
        for entry in self.parse_section("workflow", root, false, true) {
            let (key, value) = (entry.key, entry.val);
            match entry.id.as_str() {
                "name" => workflow.name = Some(self.parse_string(&value, true)),
                "on" => workflow.on = self.parse_events(&value),
                "permissions" => {
                    workflow.permissions = Some(self.parse_permissions(&value));
                }
                "env" => workflow.env = Some(self.parse_env(&value)),
                "defaults" => workflow.defaults = Some(self.parse_defaults(&value)),
                "concurrency" => {
                    workflow.concurrency = Some(self.parse_concurrency(key.pos, &value));
                }
                "jobs" => {
                    let mut jobs = BTreeMap::new();
                    for job in self.parse_section("jobs", &value, false, false) {
                        let parsed = self.parse_job(&job.key, &job.val);
                        jobs.insert(job.id, parsed);
                    }
                    workflow.jobs = Some(jobs);
                }
                "run-name" => workflow.run_name = Some(self.parse_string(&value, false)),
                _ => self.unexpected_key(
                    &key,
                    "workflow",
                    &[
                        "name",
                        "run-name",
                        "on",
                        "permissions",
                        "env",
                        "defaults",
                        "concurrency",
                        "jobs",
                    ],
                ),
            }
        }
        workflow
    }
}

fn atoi(text: &str) -> Result<i64, &'static str> {
    let digits = text.strip_prefix(['+', '-']).unwrap_or(text);
    if digits.is_empty() || !digits.bytes().all(|b| b.is_ascii_digit()) {
        return Err("invalid syntax");
    }
    text.parse::<i64>().map_err(|_| "value out of range")
}

pub struct Parsed {
    pub workflow: Option<Workflow>,
    pub errors: Vec<Diagnostic>,
}

#[must_use]
pub fn parse(source: &str) -> Parsed {
    let loaded = load(source);
    let mut parser = Parser::default();
    for error in &loaded.errors {
        parser.error_at(error.pos, error.message.clone());
    }
    let Some(root) = loaded.root else {
        if !loaded.errors.is_empty()
            && loaded
                .errors
                .iter()
                .any(|e| e.message.starts_with("could not parse"))
        {
            return Parsed {
                workflow: None,
                errors: parser.errors,
            };
        }
        parser.error_at(Pos::new(1, 1), "workflow is empty".to_owned());
        return Parsed {
            workflow: Some(Workflow::default()),
            errors: parser.errors,
        };
    };
    let workflow = parser.parse_workflow(&root);
    let document = root.pos;
    if workflow.on.is_none() {
        parser.error_at(document, "\"on\" section is missing in workflow".to_owned());
    }
    if workflow.jobs.is_none() {
        parser.error_at(
            document,
            "\"jobs\" section is missing in workflow".to_owned(),
        );
    }
    Parsed {
        workflow: Some(workflow),
        errors: parser.errors,
    }
}
