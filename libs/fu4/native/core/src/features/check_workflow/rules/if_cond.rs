use crate::entities::workflow::{Job, Step, Text};
use crate::features::check_workflow::{Report, Rule};
use crate::shared::expression::Checker;
use crate::shared::expression::Lexer;
use crate::shared::expression::parse;
use crate::shared::text::quote;
use crate::shared::yaml::Pos;

#[derive(Default)]
pub struct IfCond {
    report: Report,
}

impl IfCond {
    fn check_condition(&mut self, condition: Option<&Text>) {
        let Some(condition) = condition else {
            return;
        };
        let value = &condition.value;
        match (value.find("${{"), value.find("}}")) {
            (Some(start), Some(end)) => self.check_placeholder(condition, start, end),
            _ => self.check_expression(condition.pos, value),
        }
    }

    fn check_placeholder(&mut self, condition: &Text, start: usize, end: usize) {
        let value = &condition.value;
        if start > 0 || end + 2 < value.len() || value.matches("${{").count() > 1 {
            self.error(
                condition.pos,
                format!(
                    "if: condition {} is always evaluated to true because extra characters are around ${{{{ }}}}",
                    quote(value)
                ),
            );
            return;
        }
        let inner = value.get(start + 3..end).unwrap_or_default();
        self.check_expression(condition.pos, inner);
    }

    fn check_expression(&mut self, pos: Pos, input: &str) {
        let trimmed = input.trim();
        let source = format!("{trimmed}}}}}");
        let mut lexer = Lexer::new(&source);
        if let Ok(expr) = parse(&mut lexer)
            && Checker::is_constant(&expr)
        {
            self.error(
                pos,
                format!(
                    "constant expression {} in condition. remove the if: section",
                    quote(trimmed)
                ),
            );
        }
    }
}

impl Rule for IfCond {
    fn name(&self) -> &'static str {
        "if-cond"
    }

    fn report(&mut self) -> &mut Report {
        &mut self.report
    }

    fn visit_step(&mut self, step: &Step) {
        self.check_condition(step.condition.as_ref());
    }

    fn visit_job_pre(&mut self, job: &Job) {
        self.check_condition(job.condition.as_ref());
        if let Some(snapshot) = &job.snapshot {
            self.check_condition(snapshot.condition.as_ref());
        }
    }
}
