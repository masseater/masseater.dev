use opentelemetry::propagation::{Extractor, TextMapPropagator};
use opentelemetry::trace::TraceContextExt;
use opentelemetry_sdk::propagation::TraceContextPropagator;
use tauri::Runtime;
use tauri::http::HeaderMap;
use tauri::ipc::Invoke;
use tracing_opentelemetry::OpenTelemetrySpanExt;

struct Headers<'a>(&'a HeaderMap);

impl Extractor for Headers<'_> {
    fn get(&self, key: &str) -> Option<&str> {
        self.0.get(key).and_then(|value| value.to_str().ok())
    }

    fn keys(&self) -> Vec<&str> {
        self.0.keys().map(tauri::http::HeaderName::as_str).collect()
    }
}

pub fn invoked(headers: &HeaderMap, command: &str) -> tracing::Span {
    let runtime = tracing::Span::current()
        .context()
        .span()
        .span_context()
        .clone();
    let span = tracing::info_span!("ipc.invoke", cmd = command);
    let _ = span.set_parent(TraceContextPropagator::new().extract(&Headers(headers)));
    if runtime.is_valid() {
        span.add_link(runtime);
    }
    span
}

pub fn traced_commands<R, F>(handler: F) -> impl Fn(Invoke<R>) -> bool + Send + Sync + 'static
where
    R: Runtime,
    F: Fn(Invoke<R>) -> bool + Send + Sync + 'static,
{
    move |invoke| {
        let span = invoked(invoke.message.headers(), invoke.message.command());
        span.in_scope(|| handler(invoke))
    }
}

#[cfg(test)]
mod tests {
    use std::fs;

    use tauri::http::{HeaderMap, HeaderValue};
    use tracing_subscriber::layer::SubscriberExt;

    use super::super::{recording, spans};
    use super::invoked;

    const TRACE: &str = "4bf92f3577b34da6a3ce929d0e0e4736";
    const SCREEN_SPAN: &str = "00f067aa0ba902b7";

    #[test]
    fn continues_the_trace_the_screen_sent_with_the_command() {
        let dir = tempfile::tempdir().unwrap();
        let recording = recording(dir.path(), "app.test").unwrap();
        let subscriber = tracing_subscriber::registry().with(spans(&recording.provider));
        let mut headers = HeaderMap::new();
        headers.insert(
            "traceparent",
            HeaderValue::from_str(&format!("00-{TRACE}-{SCREEN_SPAN}-01")).unwrap(),
        );
        tracing::subscriber::with_default(subscriber, || {
            invoked(&headers, "list_songs").in_scope(|| {
                tracing::info_span!("list").in_scope(|| {});
            });
        });
        recording.provider.force_flush().unwrap();
        let written = fs::read_to_string(dir.path().join("traces.jsonl")).unwrap();
        assert!(written.contains("ipc.invoke") && written.contains("\"list\""));
        assert_eq!(written.matches(TRACE).count(), 2);
        assert!(written.contains(SCREEN_SPAN));
    }
}
