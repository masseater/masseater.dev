use candle_core::Device;
use media_notes::{Failure, Outcome};
use roformer::features::separate_stems::Separator;
use roformer::shared::hub_file::HubFile;

use crate::shared::protocol::ModelInfo;

pub struct Model {
    pub id: &'static str,
    pub label: &'static str,
    pub checkpoint: HubFile,
    pub config: HubFile,
    pub stems: &'static [&'static str],
}

const SW_OWNER: &str = "enerjazzer";
const SW_NAME: &str = "BS-ROFO-SW-Fixed";
const SW_REVISION: &str = "a443a2985534b3bc815ef54a5d446c6a0390f974";

pub const MODELS: &[Model] = &[Model {
    id: "bs-roformer-sw",
    label: "BS-RoFormer SW (6 stems)",
    checkpoint: HubFile {
        owner: SW_OWNER,
        name: SW_NAME,
        revision: SW_REVISION,
        filename: "BS-Rofo-SW-Fixed.ckpt",
    },
    config: HubFile {
        owner: SW_OWNER,
        name: SW_NAME,
        revision: SW_REVISION,
        filename: "BS-Rofo-SW-Fixed.yaml",
    },
    stems: &["bass", "drums", "other", "vocals", "guitar", "piano"],
}];

pub const DEFAULT_MODELS: &[&str] = &["bs-roformer-sw"];

#[must_use]
pub fn model(id: &str) -> Option<&'static Model> {
    MODELS.iter().find(|model| model.id == id)
}

pub fn load_separator(model: &Model, device: &Device) -> Outcome<Separator> {
    let failure = |error: &dyn std::fmt::Display| Failure::new(format!("{}: {error}", model.id));
    let checkpoint = model.checkpoint.fetch().map_err(|error| failure(&error))?;
    let config = std::fs::read_to_string(model.config.fetch().map_err(|error| failure(&error))?)?;
    Separator::load(&checkpoint, &config, device.clone()).map_err(|error| failure(&error))
}

#[must_use]
pub fn model_info(model: &Model) -> ModelInfo {
    ModelInfo {
        id: model.id.to_owned(),
        label: model.label.to_owned(),
        stems: model.stems.iter().map(|stem| (*stem).to_owned()).collect(),
    }
}

#[cfg(test)]
mod tests {
    use super::{DEFAULT_MODELS, MODELS, model};

    #[test]
    fn ids_are_unique_and_defaults_exist() {
        for (index, entry) in MODELS.iter().enumerate() {
            assert!(
                MODELS[index + 1..].iter().all(|other| other.id != entry.id),
                "{}",
                entry.id
            );
        }
        assert!(DEFAULT_MODELS.iter().all(|id| model(id).is_some()));
    }
}
