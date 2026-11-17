use std::path::PathBuf;

use crate::shared::hub_file::HubFile;

pub const REFERENCE: HubFile = HubFile {
    owner: "elicwhite",
    name: "bs-roformer-sw-6stem-onnx",
    revision: "a744f80957374e1735ad70fa122670b7961da8cc",
    filename: "reference.npz",
};

pub const SW_CHECKPOINT: HubFile = HubFile {
    owner: "enerjazzer",
    name: "BS-ROFO-SW-Fixed",
    revision: "a443a2985534b3bc815ef54a5d446c6a0390f974",
    filename: "BS-Rofo-SW-Fixed.ckpt",
};

#[must_use]
pub fn fetch(file: &HubFile) -> PathBuf {
    file.fetch().expect("pinned fixture downloads")
}

pub const SW_CONFIG: HubFile = HubFile {
    owner: "enerjazzer",
    name: "BS-ROFO-SW-Fixed",
    revision: "a443a2985534b3bc815ef54a5d446c6a0390f974",
    filename: "BS-Rofo-SW-Fixed.yaml",
};
