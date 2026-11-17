use std::path::Path;

use crate::shared::lib::Outcome;
use crate::shared::protocol::{McpAccess, Site};

pub struct MediaNotes {
    pub client: reqwest::Client,
    pub sites: &'static [Site],
    pub mcp: McpAccess,
}

pub struct Setting<'a> {
    pub name: &'static str,
    pub version: &'static str,
    pub data: &'a Path,
    pub sites: &'static [Site],
    pub port: u16,
}

pub fn media_notes(setting: &Setting<'_>) -> Outcome<MediaNotes> {
    Ok(MediaNotes {
        client: reqwest::Client::builder()
            .user_agent(format!("{}/{}", setting.name, setting.version))
            .build()?,
        sites: setting.sites,
        mcp: McpAccess {
            url: local_mcp::url(setting.port),
            token: local_mcp::token(setting.data)?,
        },
    })
}
