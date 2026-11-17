use std::io;
use std::sync::Arc;

use axum::Router;
use rmcp::ServerHandler;
use rmcp::transport::streamable_http_server::session::local::LocalSessionManager;
use rmcp::transport::streamable_http_server::{StreamableHttpServerConfig, StreamableHttpService};
use tokio::net::TcpListener;

use crate::shared::lib::guarded;

pub const HOST: &str = "127.0.0.1";
pub const MCP_PATH: &str = "/mcp";

#[must_use]
pub fn url(port: u16) -> String {
    format!("http://{HOST}:{port}{MCP_PATH}")
}

pub fn router<S: ServerHandler + Send + 'static>(
    token: String,
    tools: impl Fn() -> S + Send + Sync + 'static,
) -> Router {
    let service = StreamableHttpService::new(
        move || Ok(tools()),
        Arc::new(LocalSessionManager::default()),
        StreamableHttpServerConfig::default(),
    );
    guarded(Router::new().nest_service(MCP_PATH, service), token)
}

pub async fn serve(port: u16, router: Router) -> io::Result<()> {
    serve_on(TcpListener::bind((HOST, port)).await?, router).await
}

pub async fn serve_on(listener: TcpListener, router: Router) -> io::Result<()> {
    axum::serve(listener, router).await
}
