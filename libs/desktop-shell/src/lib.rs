mod app;
mod entities;
mod features;
mod shared;

pub use app::{Shell, builder};
pub use entities::access_token::token as mcp_token;
pub use features::record_telemetry::telemetry_plugin;
pub use features::serve_screen::{Setup, open_window, screen_port, served};
pub use features::serve_tools::{
    MCP_PATH, router as mcp_router, serve as serve_mcp, serve_on as serve_mcp_on, url as mcp_url,
};
pub use shared::lib::HOST;
pub use shared::ui::{
    browser_keys_plugin, japanese_menu, paint_like_the_page, remembered, show, state_plugin,
};
