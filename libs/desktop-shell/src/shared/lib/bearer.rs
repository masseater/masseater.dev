use std::sync::Arc;

use axum::Router;
use axum::extract::{Request, State};
use axum::http::{HeaderMap, StatusCode, header};
use axum::middleware::{self, Next};
use axum::response::{IntoResponse, Response};

const BEARER: &str = "Bearer ";

fn presented(headers: &HeaderMap, expected: &str) -> bool {
    headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix(BEARER))
        .is_some_and(|given| {
            constant_time_eq::constant_time_eq(given.as_bytes(), expected.as_bytes())
        })
}

async fn authorized(State(token): State<Arc<String>>, request: Request, next: Next) -> Response {
    if presented(request.headers(), &token) {
        return next.run(request).await;
    }
    StatusCode::UNAUTHORIZED.into_response()
}

pub fn guarded(router: Router, token: String) -> Router {
    router.layer(middleware::from_fn_with_state(Arc::new(token), authorized))
}

#[cfg(test)]
mod tests {
    use axum::http::{HeaderMap, HeaderValue, header};

    use super::presented;

    #[test]
    fn requires_the_bearer_token() {
        let mut headers = HeaderMap::new();
        assert!(!presented(&headers, "secret"));
        headers.insert(
            header::AUTHORIZATION,
            HeaderValue::from_static("Bearer secret"),
        );
        assert!(presented(&headers, "secret"));
        assert!(!presented(&headers, "other"));
    }
}
