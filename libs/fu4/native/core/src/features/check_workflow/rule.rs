use crate::entities::workflow::{Job, Step, Workflow};
use crate::shared::diagnostic::Diagnostic;
use crate::shared::yaml::Pos;

#[derive(Debug, Default)]
pub struct Report {
    pub errors: Vec<Diagnostic>,
}

impl Report {
    pub fn error(&mut self, pos: Pos, kind: &str, message: String) {
        self.errors.push(Diagnostic::new(pos, kind, message));
    }
}

pub trait Rule {
    fn name(&self) -> &'static str;

    fn report(&mut self) -> &mut Report;

    fn error(&mut self, pos: Pos, message: String) {
        let name = self.name();
        self.report().error(pos, name, message);
    }

    fn visit_workflow_pre(&mut self, _workflow: &Workflow) {}

    fn visit_job_pre(&mut self, _job: &Job) {}

    fn visit_step(&mut self, _step: &Step) {}

    fn visit_job_post(&mut self, _job: &Job) {}

    fn visit_workflow_post(&mut self, _workflow: &Workflow) {}
}
