use std::collections::BTreeMap;

use crate::shared::yaml::Pos;

#[derive(Debug, Clone, PartialEq)]
pub struct Text {
    pub value: String,
    pub quoted: bool,
    pub pos: Pos,
}

#[must_use]
pub fn contains_expression(text: &str) -> bool {
    match (text.find("${{"), text.find("}}")) {
        (Some(open), Some(close)) => open < close,
        _ => false,
    }
}

#[must_use]
pub fn is_expression_assigned(text: &str) -> bool {
    let trimmed = text.trim();
    trimmed.starts_with("${{") && trimmed.ends_with("}}") && trimmed.matches("${{").count() == 1
}

impl Text {
    #[must_use]
    pub fn contains_expression(&self) -> bool {
        contains_expression(&self.value)
    }

    #[must_use]
    pub fn is_expression_assigned(&self) -> bool {
        is_expression_assigned(&self.value)
    }
}

#[derive(Debug, Clone)]
pub struct Bool {
    pub value: bool,
    pub expression: Option<Text>,
    pub pos: Pos,
}

#[derive(Debug, Clone)]
pub struct Int {
    pub value: i64,
    pub expression: Option<Text>,
    pub pos: Pos,
}

#[derive(Debug, Clone)]
pub struct Float {
    pub value: f64,
    pub expression: Option<Text>,
    pub pos: Pos,
}

#[derive(Debug, Clone)]
pub struct EventFilter {
    pub name: Text,
    pub values: Vec<Text>,
}

#[derive(Debug, Clone)]
pub struct WebhookEvent {
    pub hook: Text,
    pub types: Vec<Text>,
    pub branches: Option<EventFilter>,
    pub branches_ignore: Option<EventFilter>,
    pub tags: Option<EventFilter>,
    pub tags_ignore: Option<EventFilter>,
    pub paths: Option<EventFilter>,
    pub paths_ignore: Option<EventFilter>,
    pub workflows: Vec<Text>,
    pub pos: Pos,
}

#[derive(Debug, Clone)]
pub struct ScheduleEntry {
    pub cron: Text,
    pub timezone: Option<Text>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DispatchInputType {
    None,
    String,
    Number,
    Boolean,
    Choice,
    Environment,
}

#[derive(Debug, Clone)]
pub struct DispatchInput {
    pub name: Text,
    pub description: Option<Text>,
    pub required: Option<Bool>,
    pub default: Option<Text>,
    pub kind: DispatchInputType,
    pub options: Vec<Text>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CallInputType {
    Invalid,
    Boolean,
    Number,
    String,
}

#[derive(Debug, Clone)]
pub struct CallEventInput {
    pub name: Text,
    pub description: Option<Text>,
    pub default: Option<Text>,
    pub required: Option<Bool>,
    pub kind: CallInputType,
    pub id: String,
}

impl CallEventInput {
    #[must_use]
    pub fn is_required(&self) -> bool {
        self.required.as_ref().is_some_and(|r| r.value)
    }
}

#[derive(Debug, Clone)]
pub struct CallEventSecret {
    pub name: Text,
    pub description: Option<Text>,
    pub required: Option<Bool>,
}

#[derive(Debug, Clone)]
pub struct CallEventOutput {
    pub name: Text,
    pub description: Option<Text>,
    pub value: Option<Text>,
}

#[derive(Debug, Clone, Default)]
pub struct WorkflowCallEvent {
    pub inputs: Vec<CallEventInput>,
    pub secrets: Option<BTreeMap<String, CallEventSecret>>,
    pub outputs: BTreeMap<String, CallEventOutput>,
    pub pos: Pos,
}

#[derive(Debug, Clone)]
pub enum Event {
    Webhook(Box<WebhookEvent>),
    Schedule {
        schedules: Vec<ScheduleEntry>,
        pos: Pos,
    },
    WorkflowDispatch {
        inputs: BTreeMap<String, DispatchInput>,
        pos: Pos,
    },
    RepositoryDispatch {
        types: Vec<Text>,
        pos: Pos,
    },
    WorkflowCall(WorkflowCallEvent),
    ImageVersion {
        names: Vec<Text>,
        versions: Vec<Text>,
        pos: Pos,
    },
}

impl Event {
    #[must_use]
    pub fn name(&self) -> &str {
        match self {
            Event::Webhook(hook) => &hook.hook.value,
            Event::Schedule { .. } => "schedule",
            Event::WorkflowDispatch { .. } => "workflow_dispatch",
            Event::RepositoryDispatch { .. } => "repository_dispatch",
            Event::WorkflowCall(_) => "workflow_call",
            Event::ImageVersion { .. } => "image_version",
        }
    }

    #[must_use]
    pub fn pos(&self) -> Pos {
        match self {
            Event::Webhook(hook) => hook.pos,
            Event::WorkflowCall(call) => call.pos,
            Event::Schedule { pos, .. }
            | Event::WorkflowDispatch { pos, .. }
            | Event::RepositoryDispatch { pos, .. }
            | Event::ImageVersion { pos, .. } => *pos,
        }
    }
}

#[derive(Debug, Clone)]
pub struct PermissionScope {
    pub name: Text,
    pub value: Text,
}

#[derive(Debug, Clone)]
pub struct Permissions {
    pub all: Option<Text>,
    pub scopes: BTreeMap<String, PermissionScope>,
    pub pos: Pos,
}

#[derive(Debug, Clone)]
pub struct DefaultsRun {
    pub shell: Option<Text>,
    pub working_directory: Option<Text>,
    pub pos: Pos,
}

#[derive(Debug, Clone)]
pub struct Defaults {
    pub run: Option<DefaultsRun>,
    pub pos: Pos,
}

#[derive(Debug, Clone)]
pub struct Concurrency {
    pub group: Option<Text>,
    pub cancel_in_progress: Option<Bool>,
    pub pos: Pos,
}

#[derive(Debug, Clone)]
pub struct Environment {
    pub name: Option<Text>,
    pub url: Option<Text>,
    pub deployment: Option<Bool>,
    pub pos: Pos,
}

#[derive(Debug, Clone)]
pub struct ExecRun {
    pub run: Option<Text>,
    pub shell: Option<Text>,
    pub working_directory: Option<Text>,
    pub run_pos: Option<Pos>,
}

#[derive(Debug, Clone)]
pub struct Input {
    pub name: Text,
    pub value: Text,
}

#[derive(Debug, Clone, Default)]
pub struct ExecAction {
    pub uses: Option<Text>,
    pub inputs: Option<BTreeMap<String, Input>>,
    pub entrypoint: Option<Text>,
    pub args: Option<Text>,
}

#[derive(Debug, Clone)]
pub enum Exec {
    Action(ExecAction),
    Run(ExecRun),
}

#[derive(Debug, Clone)]
pub enum RawValue {
    Object {
        props: BTreeMap<String, RawValue>,
        pos: Pos,
    },
    Array {
        elems: Vec<RawValue>,
        pos: Pos,
    },
    String {
        value: String,
        pos: Pos,
    },
}

impl RawValue {
    #[must_use]
    pub fn pos(&self) -> Pos {
        match self {
            RawValue::Object { pos, .. }
            | RawValue::Array { pos, .. }
            | RawValue::String { pos, .. } => *pos,
        }
    }

    #[must_use]
    pub fn equals(&self, other: &RawValue) -> bool {
        match (self, other) {
            (RawValue::Object { props: mine, .. }, RawValue::Object { props: theirs, .. }) => {
                mine.len() == theirs.len()
                    && mine.iter().all(|(name, value)| {
                        theirs.get(name).is_some_and(|other| value.equals(other))
                    })
            }
            (RawValue::Array { elems: mine, .. }, RawValue::Array { elems: theirs, .. }) => {
                mine.len() == theirs.len() && mine.iter().zip(theirs).all(|(a, b)| a.equals(b))
            }
            (RawValue::String { value: mine, .. }, RawValue::String { value: theirs, .. }) => {
                mine == theirs
            }
            _ => false,
        }
    }

    #[must_use]
    pub fn describe(&self) -> String {
        match self {
            RawValue::Object { props, .. } => {
                let mut parts: Vec<String> = props
                    .iter()
                    .map(|(name, value)| {
                        format!("{}: {}", crate::shared::text::quote(name), value.describe())
                    })
                    .collect();
                parts.sort();
                format!("{{{}}}", parts.join(", "))
            }
            RawValue::Array { elems, .. } => {
                let parts: Vec<String> = elems.iter().map(RawValue::describe).collect();
                format!("[{}]", parts.join(", "))
            }
            RawValue::String { value, .. } => crate::shared::text::quote(value),
        }
    }
}

#[derive(Debug, Clone)]
pub struct MatrixRow {
    pub name: Option<Text>,
    pub values: Vec<RawValue>,
    pub expression: Option<Text>,
}

#[derive(Debug, Clone)]
pub struct MatrixAssign {
    pub key: Text,
    pub value: RawValue,
}

#[derive(Debug, Clone)]
pub struct MatrixCombination {
    pub assigns: BTreeMap<String, MatrixAssign>,
    pub expression: Option<Text>,
}

#[derive(Debug, Clone, Default)]
pub struct MatrixCombinations {
    pub combinations: Vec<MatrixCombination>,
    pub expression: Option<Text>,
}

impl MatrixCombinations {
    #[must_use]
    pub fn contains_expression(&self) -> bool {
        self.expression.is_some() || self.combinations.iter().any(|c| c.expression.is_some())
    }
}

#[derive(Debug, Clone)]
pub struct Matrix {
    pub rows: BTreeMap<String, MatrixRow>,
    pub include: Option<MatrixCombinations>,
    pub exclude: Option<MatrixCombinations>,
    pub expression: Option<Text>,
    pub pos: Pos,
}

#[derive(Debug, Clone)]
pub struct Strategy {
    pub matrix: Option<Matrix>,
    pub fail_fast: Option<Bool>,
    pub max_parallel: Option<Int>,
    pub pos: Pos,
}

#[derive(Debug, Clone)]
pub struct EnvVar {
    pub name: Text,
    pub value: Text,
}

#[derive(Debug, Clone, Default)]
pub struct Env {
    pub vars: BTreeMap<String, EnvVar>,
    pub expression: Option<Text>,
}

#[derive(Debug, Clone)]
pub struct Step {
    pub id: Option<Text>,
    pub condition: Option<Text>,
    pub name: Option<Text>,
    pub exec: Option<Exec>,
    pub env: Option<Env>,
    pub continue_on_error: Option<Bool>,
    pub timeout_minutes: Option<Float>,
    pub pos: Pos,
}

#[derive(Debug, Clone)]
pub struct Credentials {
    pub username: Option<Text>,
    pub password: Option<Text>,
    pub expression: Option<Text>,
    pub pos: Pos,
}

#[derive(Debug, Clone)]
pub struct Container {
    pub image: Option<Text>,
    pub credentials: Option<Credentials>,
    pub env: Option<Env>,
    pub ports: Vec<Text>,
    pub volumes: Vec<Text>,
    pub options: Option<Text>,
    pub pos: Pos,
}

#[derive(Debug, Clone)]
pub struct Service {
    pub name: Text,
    pub container: Container,
}

#[derive(Debug, Clone)]
pub struct Services {
    pub value: BTreeMap<String, Service>,
    pub expression: Option<Text>,
    pub pos: Pos,
}

#[derive(Debug, Clone)]
pub struct Output {
    pub name: Text,
    pub value: Text,
}

#[derive(Debug, Clone, Default)]
pub struct Runner {
    pub labels: Vec<Text>,
    pub labels_expr: Option<Text>,
    pub group: Option<Text>,
}

#[derive(Debug, Clone)]
pub struct CallValue {
    pub name: Text,
    pub value: Text,
}

#[derive(Debug, Clone, Default)]
pub struct WorkflowCall {
    pub uses: Option<Text>,
    pub inputs: BTreeMap<String, CallValue>,
    pub secrets: BTreeMap<String, CallValue>,
    pub inherit_secrets: bool,
}

#[derive(Debug, Clone, Default)]
pub struct Snapshot {
    pub image_name: Option<Text>,
    pub version: Option<Text>,
    pub condition: Option<Text>,
}

#[derive(Debug, Clone)]
pub struct Job {
    pub id: Text,
    pub name: Option<Text>,
    pub needs: Vec<Text>,
    pub runs_on: Option<Runner>,
    pub permissions: Option<Permissions>,
    pub environment: Option<Environment>,
    pub concurrency: Option<Concurrency>,
    pub outputs: BTreeMap<String, Output>,
    pub env: Option<Env>,
    pub defaults: Option<Defaults>,
    pub condition: Option<Text>,
    pub steps: Option<Vec<Step>>,
    pub timeout_minutes: Option<Float>,
    pub strategy: Option<Strategy>,
    pub continue_on_error: Option<Bool>,
    pub container: Option<Container>,
    pub services: Option<Services>,
    pub workflow_call: Option<WorkflowCall>,
    pub snapshot: Option<Snapshot>,
    pub pos: Pos,
}

#[derive(Debug, Clone, Default)]
pub struct Workflow {
    pub name: Option<Text>,
    pub run_name: Option<Text>,
    pub on: Option<Vec<Event>>,
    pub permissions: Option<Permissions>,
    pub env: Option<Env>,
    pub defaults: Option<Defaults>,
    pub concurrency: Option<Concurrency>,
    pub jobs: Option<BTreeMap<String, Job>>,
}

impl Workflow {
    #[must_use]
    pub fn workflow_call_event(&self) -> Option<&WorkflowCallEvent> {
        self.on.iter().flatten().find_map(|event| match event {
            Event::WorkflowCall(call) => Some(call),
            _ => None,
        })
    }
}
