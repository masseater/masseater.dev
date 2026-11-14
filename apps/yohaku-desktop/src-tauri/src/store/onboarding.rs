use rusqlite::{Connection, params};

use crate::model::OnboardingStep;

use super::now;

pub fn done(connection: &Connection) -> rusqlite::Result<Vec<OnboardingStep>> {
    connection
        .prepare_cached("select step from onboarding order by done_at")?
        .query_map([], |row| row.get::<_, String>(0))?
        .filter_map(|step| step.map(|step| OnboardingStep::parse(&step)).transpose())
        .collect()
}

pub fn complete(connection: &Connection, step: OnboardingStep) -> rusqlite::Result<()> {
    connection.execute(
        "insert into onboarding (step, done_at) values (?1, ?2) on conflict (step) do nothing",
        params![step.as_str(), now()],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::model::OnboardingStep;
    use crate::store::Store;

    #[test]
    fn remembers_each_step_once() {
        let store = Store::in_memory().expect("store");
        store
            .with(|c| {
                super::complete(c, OnboardingStep::Setup)?;
                super::complete(c, OnboardingStep::Setup)?;
                super::complete(c, OnboardingStep::SourceHint)
            })
            .expect("complete");
        let done = store.with(|c| super::done(c)).expect("done");
        assert_eq!(done, [OnboardingStep::Setup, OnboardingStep::SourceHint]);
    }
}
