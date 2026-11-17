mod entities;
mod features;
mod shared;

pub use entities::detector::Detector;
pub use features::scan_git::GitSource;
pub use shared::finding::{Confidence, Finding};
