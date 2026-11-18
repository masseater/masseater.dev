use std::collections::HashMap;
use std::sync::{Mutex, PoisonError};

use tracing::{Span, field, info_span};

use crate::shared::protocol::JobKind;

const FAILED: &str = "ERROR";

struct Traced {
    job: Span,
    stage: Option<(String, Span)>,
}

#[derive(Default)]
pub struct Traces {
    spans: Mutex<HashMap<String, Traced>>,
}

impl Traces {
    pub fn open(&self, id: &str, kind: JobKind, label: &str) {
        let job = info_span!(
            parent: None,
            "job",
            job.kind = kind.as_str(),
            job.label = label,
            otel.status_code = field::Empty,
            error.message = field::Empty,
        );
        self.spans
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
            .insert(id.to_owned(), Traced { job, stage: None });
    }

    pub fn stage(&self, id: &str, stage: &str) {
        let mut spans = self.spans.lock().unwrap_or_else(PoisonError::into_inner);
        if let Some(traced) = spans.get_mut(id)
            && traced.stage.as_ref().is_none_or(|(name, _)| name != stage)
        {
            let span = info_span!(parent: &traced.job, "job.stage", job.stage = stage);
            traced.stage = Some((stage.to_owned(), span));
        }
        drop(spans);
    }

    pub fn close(&self, id: &str, failure: Option<&str>) {
        let closed = self
            .spans
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
            .remove(id);
        if let (Some(traced), Some(message)) = (closed, failure) {
            traced.job.record("otel.status_code", FAILED);
            traced.job.record("error.message", message);
        }
    }
}

#[cfg(test)]
mod tests {
    use opentelemetry::trace::{Status, TracerProvider as _};
    use opentelemetry_sdk::trace::{InMemorySpanExporter, SdkTracerProvider};
    use tracing_subscriber::layer::SubscriberExt;

    use super::Traces;
    use crate::shared::protocol::JobKind;

    #[test]
    fn a_job_is_a_span_with_one_child_per_stage() {
        let exporter = InMemorySpanExporter::default();
        let provider = SdkTracerProvider::builder()
            .with_simple_exporter(exporter.clone())
            .build();
        let subscriber = tracing_subscriber::registry()
            .with(tracing_opentelemetry::layer().with_tracer(provider.tracer("test")));
        tracing::subscriber::with_default(subscriber, || {
            let traces = Traces::default();
            traces.open("job", JobKind::Separate, "song");
            traces.stage("job", "decoding");
            traces.stage("job", "separating");
            traces.stage("job", "separating");
            traces.close("job", Some("out of memory"));
        });
        let spans = exporter.get_finished_spans().unwrap();
        let names: Vec<&str> = spans.iter().map(|span| span.name.as_ref()).collect();
        assert_eq!(names, ["job.stage", "job.stage", "job"]);
        let job = &spans[2];
        assert_eq!(job.status, Status::error(""));
        assert!(
            spans[..2]
                .iter()
                .all(|stage| stage.parent_span_id == job.span_context.span_id())
        );
    }
}
