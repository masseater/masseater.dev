use std::collections::HashMap;
use std::sync::OnceLock;

use opentelemetry::propagation::TextMapPropagator;
use opentelemetry::trace::TracerProvider as _;
use opentelemetry_sdk::propagation::TraceContextPropagator;
use opentelemetry_sdk::trace::SdkTracerProvider;
use tracing_opentelemetry::OpenTelemetrySpanExt;
use tracing_subscriber::layer::SubscriberExt;

static PROVIDER: OnceLock<Option<SdkTracerProvider>> = OnceLock::new();

fn configured() -> bool {
    let set = |key: &str| std::env::var(key).is_ok_and(|value| !value.trim().is_empty());
    let disabled = std::env::var("OTEL_SDK_DISABLED")
        .is_ok_and(|value| value.trim().eq_ignore_ascii_case("true"));
    !disabled && (set("OTEL_EXPORTER_OTLP_ENDPOINT") || set("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT"))
}

fn start() -> Option<SdkTracerProvider> {
    if !configured() {
        return None;
    }
    let resource = init_tracing_opentelemetry::resource::DetectResource::default()
        .with_fallback_service_name("wism")
        .with_fallback_service_version(env!("CARGO_PKG_VERSION"))
        .build();
    let provider = init_tracing_opentelemetry::otlp::traces::init_tracerprovider(
        resource,
        init_tracing_opentelemetry::otlp::traces::identity,
    )
    .ok()?;
    let layer = tracing_opentelemetry::layer().with_tracer(provider.tracer("wism"));
    tracing::subscriber::set_global_default(tracing_subscriber::registry().with(layer)).ok()?;
    Some(provider)
}

pub fn init() {
    PROVIDER.get_or_init(start);
}

pub fn adopt(span: &tracing::Span, traceparent: Option<&str>) {
    let Some(traceparent) = traceparent else {
        return;
    };
    if PROVIDER.get().is_none_or(Option::is_none) {
        return;
    }
    let carrier = HashMap::from([("traceparent".to_owned(), traceparent.to_owned())]);
    let context = TraceContextPropagator::new().extract(&carrier);
    let _ = span.set_parent(context);
}

pub fn flush() {
    if let Some(Some(provider)) = PROVIDER.get() {
        let _ = provider.force_flush();
    }
}
