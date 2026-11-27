mod appender;
mod invoke;

use std::borrow::Cow;
use std::error::Error;
use std::path::Path;

use opentelemetry::trace::TracerProvider as _;
use opentelemetry_sdk::Resource;
use opentelemetry_sdk::trace::SdkTracerProvider;
use otlp_file_exporter::FileExporter;
use tauri::http::{Method, Request, Response, StatusCode, header};
use tauri::plugin::{Builder, TauriPlugin};
use tauri::{AppHandle, Manager, RunEvent, Runtime};
use tracing_subscriber::Layer;
use tracing_subscriber::filter::{LevelFilter, Targets};
use tracing_subscriber::layer::SubscriberExt;

use appender::Appender;
pub use invoke::traced_commands;

const FOLDER: &str = "telemetry";
const SCHEME: &str = "otlp";
const TRACES: &str = "traces";
const LOGS: &str = "logs";
const BATCH_LIMIT: usize = 4 * 1024 * 1024;
const TRACED_CRATES: &[&str] = &["tauri", "tauri_runtime_wry"];

struct Recording {
    provider: SdkTracerProvider,
    screen_traces: Appender,
    screen_logs: Appender,
}

fn provider(appender: Appender, service: &str) -> SdkTracerProvider {
    let resource = Resource::builder()
        .with_service_name(service.to_owned())
        .build();
    SdkTracerProvider::builder()
        .with_resource(resource.clone())
        .with_batch_exporter(FileExporter::new(appender, resource))
        .build()
}

fn spans<S>(provider: &SdkTracerProvider) -> impl Layer<S> + use<S>
where
    S: tracing::Subscriber + for<'span> tracing_subscriber::registry::LookupSpan<'span>,
{
    let filter = TRACED_CRATES.iter().fold(
        Targets::new().with_default(LevelFilter::INFO),
        |filter, name| filter.with_target(*name, LevelFilter::TRACE),
    );
    tracing_opentelemetry::layer()
        .with_tracer(provider.tracer(env!("CARGO_PKG_NAME")))
        .with_filter(filter)
}

fn recording(dir: &Path, service: &str) -> std::io::Result<Recording> {
    let traces = Appender::open(dir, TRACES)?;
    Ok(Recording {
        provider: provider(traces.clone(), service),
        screen_traces: traces,
        screen_logs: Appender::open(dir, LOGS)?,
    })
}

impl Recording {
    fn screen(&self, path: &str) -> Option<&Appender> {
        match path.strip_prefix("/v1/")? {
            TRACES => Some(&self.screen_traces),
            LOGS => Some(&self.screen_logs),
            _ => None,
        }
    }
}

fn install(provider: &SdkTracerProvider) -> Result<(), tracing::subscriber::SetGlobalDefaultError> {
    tracing::subscriber::set_global_default(tracing_subscriber::registry().with(spans(provider)))
}

fn start<R: Runtime>(app: &AppHandle<R>) -> Result<(), Box<dyn Error>> {
    let recording = recording(
        &app.path().app_log_dir()?.join(FOLDER),
        &app.config().identifier,
    )?;
    install(&recording.provider)?;
    app.manage(recording);
    Ok(())
}

fn batch(body: &[u8]) -> Result<serde_json::Value, StatusCode> {
    if body.len() > BATCH_LIMIT {
        return Err(StatusCode::PAYLOAD_TOO_LARGE);
    }
    serde_json::from_slice(body).map_err(|_| StatusCode::BAD_REQUEST)
}

fn record<R: Runtime>(app: &AppHandle<R>, request: &Request<Vec<u8>>) -> StatusCode {
    if request.method() == Method::OPTIONS {
        return StatusCode::NO_CONTENT;
    }
    if request.method() != Method::POST {
        return StatusCode::NOT_FOUND;
    }
    let Some(recording) = app.try_state::<Recording>() else {
        return StatusCode::SERVICE_UNAVAILABLE;
    };
    let Some(appender) = recording.screen(request.uri().path()) else {
        return StatusCode::NOT_FOUND;
    };
    match batch(request.body()).map(|batch| appender.line(&batch)) {
        Ok(Ok(())) => StatusCode::OK,
        Ok(Err(_)) => StatusCode::INTERNAL_SERVER_ERROR,
        Err(status) => status,
    }
}

fn answer(status: StatusCode) -> Response<Cow<'static, [u8]>> {
    let mut response = Response::new(Cow::Borrowed(&[][..]));
    *response.status_mut() = status;
    let headers = response.headers_mut();
    for (name, value) in [
        (header::ACCESS_CONTROL_ALLOW_ORIGIN, "*"),
        (header::ACCESS_CONTROL_ALLOW_METHODS, "POST"),
        (header::ACCESS_CONTROL_ALLOW_HEADERS, "content-type"),
    ] {
        headers.insert(name, header::HeaderValue::from_static(value));
    }
    response
}

#[must_use]
pub fn telemetry_plugin<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("telemetry")
        .setup(|app, _api| start(app))
        .register_uri_scheme_protocol(SCHEME, |context, request| {
            answer(record(context.app_handle(), &request))
        })
        .on_event(|app, event| {
            if matches!(event, RunEvent::Exit)
                && let Some(recording) = app.try_state::<Recording>()
            {
                let _ = recording.provider.shutdown();
            }
        })
        .build()
}

#[cfg(test)]
mod tests {
    use std::fs;

    use tracing_subscriber::layer::SubscriberExt;

    use super::{BATCH_LIMIT, StatusCode, batch, install, recording, spans};

    struct Silent;

    impl tauri_plugin_log::log::Log for Silent {
        fn enabled(&self, _metadata: &tauri_plugin_log::log::Metadata<'_>) -> bool {
            false
        }

        fn log(&self, _record: &tauri_plugin_log::log::Record<'_>) {}

        fn flush(&self) {}
    }

    #[test]
    fn leaves_the_log_logger_to_the_log_plugin() {
        let dir = tempfile::tempdir().unwrap();
        let recording = recording(dir.path(), "app.test").unwrap();
        install(&recording.provider).unwrap();
        assert!(tauri_plugin_log::log::set_boxed_logger(Box::new(Silent)).is_ok());
    }

    #[test]
    fn writes_spans_from_the_app_and_its_tauri_runtime_to_the_trace_file() {
        let dir = tempfile::tempdir().unwrap();
        let recording = recording(dir.path(), "app.test").unwrap();
        let subscriber = tracing_subscriber::registry().with(spans(&recording.provider));
        tracing::subscriber::with_default(subscriber, || {
            tracing::info_span!("job").in_scope(|| {});
            tracing::trace_span!(target: "tauri::ipc", "ipc::request::handle").in_scope(|| {});
            tracing::debug_span!("noise").in_scope(|| {});
        });
        recording.provider.force_flush().unwrap();
        recording
            .screen("/v1/traces")
            .unwrap()
            .line(&serde_json::json!({ "resourceSpans": [] }))
            .unwrap();
        let written = fs::read_to_string(dir.path().join("traces.jsonl")).unwrap();
        let lines: Vec<&str> = written.lines().collect();
        assert_eq!(lines.len(), 2);
        assert!(lines[0].contains("\"job\"") && lines[0].contains("ipc::request::handle"));
        assert!(lines[0].contains("app.test") && !lines[0].contains("noise"));
    }

    #[test]
    fn keeps_screen_logs_apart_from_traces_and_refuses_other_paths() {
        let dir = tempfile::tempdir().unwrap();
        let recording = recording(dir.path(), "app.test").unwrap();
        recording
            .screen("/v1/logs")
            .unwrap()
            .line(&serde_json::json!({ "resourceLogs": [] }))
            .unwrap();
        let written = fs::read_to_string(dir.path().join("logs.jsonl")).unwrap();
        assert_eq!(written, "{\"resourceLogs\":[]}\n");
        assert!(recording.screen("/v1/metrics").is_none());
        assert!(recording.screen("/logs").is_none());
    }

    #[test]
    fn refuses_batches_that_are_too_large_or_not_json() {
        assert!(batch(b"{\"resourceSpans\":[]}").is_ok());
        assert_eq!(batch(b"not json"), Err(StatusCode::BAD_REQUEST));
        let mut large = vec![b' '; BATCH_LIMIT];
        large.extend_from_slice(b"{}");
        assert_eq!(batch(&large), Err(StatusCode::PAYLOAD_TOO_LARGE));
    }
}
