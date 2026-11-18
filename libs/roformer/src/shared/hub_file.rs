use std::path::PathBuf;

use hf_hub::{HFClientSync, HFResult};

pub struct HubFile {
    pub owner: &'static str,
    pub name: &'static str,
    pub revision: &'static str,
    pub filename: &'static str,
}

impl HubFile {
    pub fn fetch(&self) -> HFResult<PathBuf> {
        HFClientSync::new()?
            .model(self.owner, self.name)
            .download_file()
            .filename(self.filename.to_string())
            .revision(self.revision.to_string())
            .send()
    }
}
