mod appender;

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
use tracing_subscriber::util::SubscriberInitExt;

use appender::Appender;

const FOLDER: &str = "telemetry";
const SCHEME: &str = "otlp";
const TRACES_PATH: &str = "/v1/traces";
const TRACED_CRATES: &[&str] = &["tauri", "tauri_runtime_wry"];

struct Recording {
    provider: SdkTracerProvider,
    screen: Appender,
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
    let appender = Appender::open(dir)?;
    Ok(Recording {
        provider: provider(appender.clone(), service),
        screen: appender,
    })
}

fn start<R: Runtime>(app: &AppHandle<R>) -> Result<(), Box<dyn Error>> {
    let recording = recording(
        &app.path().app_log_dir()?.join(FOLDER),
        &app.config().identifier,
    )?;
    tracing_subscriber::registry()
        .with(spans(&recording.provider))
        .try_init()?;
    app.manage(recording);
    Ok(())
}

fn record<R: Runtime>(app: &AppHandle<R>, request: &Request<Vec<u8>>) -> StatusCode {
    if request.method() == Method::OPTIONS {
        return StatusCode::NO_CONTENT;
    }
    if request.method() != Method::POST || request.uri().path() != TRACES_PATH {
        return StatusCode::NOT_FOUND;
    }
    let Some(recording) = app.try_state::<Recording>() else {
        return StatusCode::SERVICE_UNAVAILABLE;
    };
    let Ok(spans) = serde_json::from_slice::<serde_json::Value>(request.body()) else {
        return StatusCode::BAD_REQUEST;
    };
    match recording.screen.line(&spans) {
        Ok(()) => StatusCode::OK,
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
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

    use super::{recording, spans};

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
            .screen
            .line(&serde_json::json!({ "resourceSpans": [] }))
            .unwrap();
        let written = fs::read_to_string(dir.path().join("traces.jsonl")).unwrap();
        let lines: Vec<&str> = written.lines().collect();
        assert_eq!(lines.len(), 2);
        assert!(lines[0].contains("\"job\"") && lines[0].contains("ipc::request::handle"));
        assert!(lines[0].contains("app.test") && !lines[0].contains("noise"));
    }
}
