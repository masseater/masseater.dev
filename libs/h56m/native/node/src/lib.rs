mod features;

pub use features::scan_secrets::{
    DetectorInput, Flush, GitInput, SecretDetector, TextInput, flush_telemetry,
};
