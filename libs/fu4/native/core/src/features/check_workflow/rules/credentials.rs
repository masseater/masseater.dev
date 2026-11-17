use crate::entities::workflow::{Container, Job};
use crate::features::check_workflow::{Report, Rule};
use crate::shared::text::quote;

#[derive(Default)]
pub struct Credentials {
    report: Report,
}

impl Credentials {
    fn check_container(&mut self, place: &str, container: &Container) {
        let Some(password) = container
            .credentials
            .as_ref()
            .and_then(|c| c.password.as_ref())
        else {
            return;
        };
        if !password.is_expression_assigned() {
            self.error(
                password.pos,
                format!("\"password\" section in {place} should be specified via secrets. do not put password value directly"),
            );
        }
    }
}

impl Rule for Credentials {
    fn name(&self) -> &'static str {
        "credentials"
    }

    fn report(&mut self) -> &mut Report {
        &mut self.report
    }

    fn visit_job_pre(&mut self, job: &Job) {
        if let Some(container) = &job.container {
            self.check_container("\"container\" section", container);
        }
        for service in job.services.iter().flat_map(|s| s.value.values()) {
            self.check_container(
                &format!("{} service", quote(&service.name.value)),
                &service.container,
            );
        }
    }
}
