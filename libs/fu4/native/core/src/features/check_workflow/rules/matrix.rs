use std::collections::{BTreeMap, BTreeSet};

use crate::entities::workflow::{Job, Matrix as Section, MatrixRow, RawValue, contains_expression};
use crate::features::check_workflow::{Report, Rule};
use crate::shared::text::{quote, sorted_quotes};

fn is_subset(value: &RawValue, sub: &RawValue) -> bool {
    if let RawValue::String { value: text, .. } = sub
        && contains_expression(text)
    {
        return true;
    }
    match (value, sub) {
        (RawValue::Object { props, .. }, RawValue::Object { props: subs, .. }) => subs
            .iter()
            .all(|(name, s)| props.get(name).is_some_and(|p| is_subset(p, s))),
        (RawValue::Object { .. } | RawValue::Array { .. }, _) => {
            if let (RawValue::Array { elems, .. }, RawValue::Array { elems: subs, .. }) =
                (value, sub)
            {
                elems.len() == subs.len() && elems.iter().zip(subs).all(|(v, s)| is_subset(v, s))
            } else {
                false
            }
        }
        (RawValue::String { value: text, .. }, _) => contains_expression(text) || value.equals(sub),
    }
}

#[derive(Default)]
pub struct Matrix {
    report: Report,
}

impl Matrix {
    fn check_duplicates(&mut self, row: &MatrixRow) {
        if row.expression.is_some() {
            return;
        }
        let name = row
            .name
            .as_ref()
            .map_or("", |n| n.value.as_str())
            .to_owned();
        let mut seen: Vec<&RawValue> = Vec::new();
        for value in &row.values {
            if let Some(previous) = seen.iter().find(|p| p.equals(value)) {
                let message = format!(
                    "duplicate value {} is found in matrix {}. the same value is at {}",
                    value.describe(),
                    quote(&name),
                    previous.pos().describe()
                );
                self.error(value.pos(), message);
                continue;
            }
            seen.push(value);
        }
    }

    fn check_exclude(&mut self, matrix: &Section) {
        let Some(exclude) = &matrix.exclude else {
            return;
        };
        if exclude.combinations.is_empty()
            || matrix
                .include
                .as_ref()
                .is_some_and(crate::entities::workflow::MatrixCombinations::contains_expression)
        {
            return;
        }
        if matrix.rows.is_empty()
            && matrix
                .include
                .as_ref()
                .is_none_or(|i| i.combinations.is_empty())
        {
            self.error(
                matrix.pos,
                "\"exclude\" section exists but no matrix variation exists".to_owned(),
            );
            return;
        }
        let mut rows: BTreeMap<&str, Vec<&RawValue>> = BTreeMap::new();
        let mut ignored: BTreeSet<&str> = BTreeSet::new();
        for (name, row) in &matrix.rows {
            if row.expression.is_some() {
                ignored.insert(name);
            } else {
                rows.insert(name, row.values.iter().collect());
            }
        }
        for combination in matrix.include.iter().flat_map(|i| &i.combinations) {
            for (name, assign) in &combination.assigns {
                if ignored.contains(name.as_str()) {
                    continue;
                }
                let row = rows.entry(name).or_default();
                if !row.iter().any(|v| v.equals(&assign.value)) {
                    row.push(&assign.value);
                }
            }
        }
        for combination in &exclude.combinations {
            for (key, assign) in &combination.assigns {
                if ignored.contains(key.as_str()) {
                    continue;
                }
                let Some(row) = rows.get(key.as_str()) else {
                    let names: Vec<&str> = rows.keys().copied().collect();
                    self.error(
                        assign.key.pos,
                        format!(
                            "{} in \"exclude\" section does not exist in matrix. available matrix configurations are {}",
                            quote(key),
                            sorted_quotes(&names)
                        ),
                    );
                    continue;
                };
                if row.iter().any(|v| is_subset(v, &assign.value)) {
                    continue;
                }
                let values: Vec<String> = row.iter().map(|v| v.describe()).collect();
                let message = format!(
                    "value {} in \"exclude\" does not match in matrix {} combinations. possible values are {}",
                    assign.value.describe(),
                    quote(key),
                    values.join(", ")
                );
                self.error(assign.value.pos(), message);
            }
        }
    }
}

impl Rule for Matrix {
    fn name(&self) -> &'static str {
        "matrix"
    }

    fn report(&mut self) -> &mut Report {
        &mut self.report
    }

    fn visit_job_pre(&mut self, job: &Job) {
        let Some(matrix) = job.strategy.as_ref().and_then(|s| s.matrix.as_ref()) else {
            return;
        };
        if matrix.expression.is_some() {
            return;
        }
        for row in matrix.rows.values() {
            self.check_duplicates(row);
        }
        self.check_exclude(matrix);
    }
}
