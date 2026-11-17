use github_actions_models::common::CacheMode;

use crate::features::audit_workflow::{
    finding::location::SymbolicLocation, models::workflow::JobCommon,
};

#[derive(Clone, Debug)]
pub(crate) struct EffectiveCacheMode<'doc> {
    pub(crate) mode: CacheMode,

    pub(crate) location: Option<SymbolicLocation<'doc>>,
}

pub(crate) trait HasEffectiveCacheMode<'doc> {
    fn effective_cache_mode(&self) -> EffectiveCacheMode<'doc>;
}

impl<'doc, Job: JobCommon<'doc>> HasEffectiveCacheMode<'doc> for Job {
    fn effective_cache_mode(&self) -> EffectiveCacheMode<'doc> {
        match self.cache_mode() {
            Some(mode) => EffectiveCacheMode {
                mode,
                location: Some(self.location().with_keys(["cache-mode".into()])),
            },
            None => {
                if let Some(mode) = self.parent().cache_mode {
                    EffectiveCacheMode {
                        mode,
                        location: Some(self.parent().location().with_keys(["cache-mode".into()])),
                    }
                } else {
                    let events = &self.parent().on.events;
                    if events.push.is_present()
                        || events.workflow_dispatch.is_present()
                        || events.repository_dispatch.is_present()
                        || events.delete.is_present()
                        || events.registry_package.is_present()
                        || events.page_build.is_present()
                        || events.schedule.is_present()
                    {
                        EffectiveCacheMode {
                            mode: CacheMode::Write,
                            location: None,
                        }
                    } else {
                        EffectiveCacheMode {
                            mode: CacheMode::Read,
                            location: None,
                        }
                    }
                }
            }
        }
    }
}
