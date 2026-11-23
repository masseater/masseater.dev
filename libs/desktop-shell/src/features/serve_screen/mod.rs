use tauri::utils::acl::capability::{Capability, CapabilityRemote};
use tauri::{App, Builder, Manager, Runtime, Url, WebviewUrl, WebviewWindowBuilder, Wry};

use crate::shared::lib::HOST;
use crate::shared::ui::paint_like_the_page;

pub type Setup = Result<(), Box<dyn std::error::Error>>;

const SERVED: &str = "served-screen";

fn bound_port(port: u16) -> std::io::Result<u16> {
    Ok(std::net::TcpListener::bind((HOST, port))?
        .local_addr()?
        .port())
}

pub fn screen_port(preferred: u16) -> std::io::Result<u16> {
    bound_port(preferred).or_else(|_| bound_port(0))
}

fn origin(port: u16) -> String {
    format!("http://{HOST}:{port}")
}

fn served_at(port: u16) -> Result<WebviewUrl, url::ParseError> {
    if tauri::is_dev() {
        return Ok(WebviewUrl::default());
    }
    Ok(WebviewUrl::External(Url::parse(&origin(port))?))
}

fn served_capability(capability: &str, port: u16) -> serde_json::Result<String> {
    let mut capability: Capability = serde_json::from_str(capability)?;
    SERVED.clone_into(&mut capability.identifier);
    capability.local = false;
    capability.remote = Some(CapabilityRemote {
        urls: vec![origin(port)],
    });
    serde_json::to_string(&capability)
}

pub fn allow_screen<R: Runtime>(app: &impl Manager<R>, port: u16, capability: &str) -> Setup {
    app.add_capability(served_capability(capability, port)?)?;
    Ok(())
}

#[must_use]
pub fn served(app: Builder<Wry>, port: u16) -> Builder<Wry> {
    if tauri::is_dev() {
        return app;
    }
    app.plugin(
        tauri_plugin_localhost::Builder::new(port)
            .host(HOST)
            .build(),
    )
}

pub fn open_window(app: &App, port: u16, capability: &str) -> Setup {
    if !tauri::is_dev() {
        allow_screen(app, port, capability)?;
    }
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

    use tauri::Url;
    use tauri::utils::acl::RemoteUrlPattern;
    use tauri::utils::acl::capability::Capability;

    use super::{HOST, SERVED, origin, screen_port, served_capability};

    const CAPABILITY: &str = r#"{
        "$schema": "../gen/schemas/desktop-schema.json",
        "identifier": "default",
        "windows": ["main"],
        "permissions": ["core:default", "allow-list-marks"]
    }"#;

    #[test]
    fn the_served_screen_gets_the_permissions_of_the_capability_on_its_own_origin_only() {
        let local: Capability = serde_json::from_str(CAPABILITY).unwrap();
        let served: Capability =
            serde_json::from_str(&served_capability(CAPABILITY, 47_231).unwrap()).unwrap();
        assert_eq!(served.identifier, SERVED);
        assert!(!served.local);
        assert_eq!(served.windows, local.windows);
        assert_eq!(served.permissions, local.permissions);
        assert_eq!(served.remote.unwrap().urls, ["http://127.0.0.1:47231"]);
    }

    #[test]
    fn the_origin_covers_every_page_of_the_chosen_port_and_no_other_port() {
        let pattern: RemoteUrlPattern = origin(47_231).parse().unwrap();
        let page = |url: &str| pattern.test(&Url::parse(url).unwrap());
        assert!(page("http://127.0.0.1:47231/"));
        assert!(page("http://127.0.0.1:47231/assets/index.js?v=1#top"));
        assert!(!page("http://127.0.0.1:47232/"));
        assert!(!page("http://127.0.0.1/"));
        assert!(!page("http://localhost:47231/"));
        assert!(!page("https://127.0.0.1:47231/"));
    }

    #[test]
    fn keeps_the_preferred_port_when_it_is_free() {
        let free = TcpListener::bind((HOST, 0))
            .unwrap()
            .local_addr()
            .unwrap()
            .port();
        assert_eq!(screen_port(free).unwrap(), free);
    }

    #[test]
    fn moves_to_another_port_when_the_preferred_one_is_taken() {
        let taken = TcpListener::bind((HOST, 0)).unwrap();
        let port = taken.local_addr().unwrap().port();
        let chosen = screen_port(port).unwrap();
        assert_ne!(chosen, port);
        assert_ne!(chosen, 0);
    }
}
