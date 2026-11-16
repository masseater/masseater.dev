use tauri::{App, Builder, Url, WebviewUrl, WebviewWindowBuilder, Wry};

use crate::window::paint_like_the_page;

pub type Setup = Result<(), Box<dyn std::error::Error>>;

fn bound_port(port: u16) -> std::io::Result<u16> {
    Ok(std::net::TcpListener::bind((local_mcp::HOST, port))?
        .local_addr()?
        .port())
}

pub fn screen_port(preferred: u16) -> std::io::Result<u16> {
    bound_port(preferred).or_else(|_| bound_port(0))
}

fn served_at(port: u16) -> Result<WebviewUrl, url::ParseError> {
    if tauri::is_dev() {
        return Ok(WebviewUrl::default());
    }
    Ok(WebviewUrl::External(Url::parse(&format!(
        "http://{}:{port}",
        local_mcp::HOST
    ))?))
}

#[must_use]
pub fn served(app: Builder<Wry>, port: u16) -> Builder<Wry> {
    if tauri::is_dev() {
        return app;
    }
    app.plugin(
        tauri_plugin_localhost::Builder::new(port)
            .host(local_mcp::HOST)
            .build(),
    )
}

pub fn open_window(app: &App, port: u16) -> Setup {
    let mut config = app
        .config()
        .app
        .windows
        .first()
        .cloned()
        .ok_or("tauri.conf.json has no window")?;
    config.url = served_at(port)?;
    let window = WebviewWindowBuilder::from_config(app, &config)?.build()?;
    paint_like_the_page(&window);
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::net::TcpListener;

    use super::screen_port;

    #[test]
    fn keeps_the_preferred_port_when_it_is_free() {
        let free = TcpListener::bind((local_mcp::HOST, 0))
            .unwrap()
            .local_addr()
            .unwrap()
            .port();
        assert_eq!(screen_port(free).unwrap(), free);
    }

    #[test]
    fn moves_to_another_port_when_the_preferred_one_is_taken() {
        let taken = TcpListener::bind((local_mcp::HOST, 0)).unwrap();
        let port = taken.local_addr().unwrap().port();
        let chosen = screen_port(port).unwrap();
        assert_ne!(chosen, port);
        assert_ne!(chosen, 0);
    }
}
